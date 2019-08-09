import json
import logging
from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.db.models import F
from django.db.models import Max
from django.db.models import Sum
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.http import HttpResponseNotFound
from le_utils.constants import content_kinds
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import License
from contentcuration.serializers import ContentNodeEditSerializer
from contentcuration.serializers import ReadOnlyContentNodeFullSerializer
from contentcuration.serializers import ReadOnlyContentNodeSerializer
from contentcuration.serializers import ReadOnlySimplifiedContentNodeSerializer
from contentcuration.serializers import TaskSerializer
from contentcuration.tasks import create_async_task
from contentcuration.tasks import getnodedetails_task


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['GET'])
def get_node_diff(request, channel_id):
    try:
        request.user.can_edit(channel_id)
    except PermissionDenied:
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    original = []   # Currently imported nodes
    changed = []    # Nodes from original node
    fields_to_check = ['title', 'description', 'license', 'license_description', 'copyright_holder', 'author', 'extra_fields', 'language', 'role_visibility']
    assessment_fields_to_check = ['type', 'question', 'hints', 'answers', 'order', 'raw_data', 'source_url', 'randomize']

    current_tree_id = Channel.objects.get(pk=channel_id).main_tree.tree_id
    nodes = ContentNode.objects.prefetch_related('assessment_items').prefetch_related('files').prefetch_related('tags')

    copied_nodes = nodes.filter(tree_id=current_tree_id).exclude(original_source_node_id=F('node_id'))
    channel_ids = copied_nodes.values_list('original_channel_id', flat=True).exclude(original_channel_id=channel_id).distinct()
    tree_ids = Channel.objects.filter(pk__in=channel_ids).values_list("main_tree__tree_id", flat=True)
    original_node_ids = copied_nodes.values_list('original_source_node_id', flat=True).distinct()
    original_nodes = nodes.filter(tree_id__in=tree_ids, node_id__in=original_node_ids)

    # Use dictionary for faster lookup speed
    content_id_mapping = {n.content_id: n for n in original_nodes}

    for copied_node in copied_nodes:
        node = content_id_mapping.get(copied_node.content_id)

        if node:
            # Check lengths, metadata, tags, files, and assessment items
            node_changed = node.assessment_items.count() != copied_node.assessment_items.count() or \
                node.files.count() != copied_node.files.count() or \
                node.tags.count() != copied_node.tags.count() or \
                any(filter(lambda f: getattr(node, f, None) != getattr(copied_node, f, None), fields_to_check)) or \
                node.tags.exclude(tag_name__in=copied_node.tags.values_list('tag_name', flat=True)).exists() or \
                node.files.exclude(checksum__in=copied_node.files.values_list('checksum', flat=True)).exists() or \
                node.assessment_items.exclude(assessment_id__in=copied_node.assessment_items.values_list('assessment_id', flat=True)).exists()

            # Check individual assessment items
            if not node_changed and node.kind_id == content_kinds.EXERCISE:
                for ai in node.assessment_items.all():
                    source_ai = copied_node.assessment_items.filter(assessment_id=ai.assessment_id).first()
                    if source_ai:
                        node_changed = node_changed or any(filter(lambda f: getattr(ai, f, None) != getattr(source_ai, f, None), assessment_fields_to_check))
                        if node_changed:
                            break

            if node_changed:
                original.append(copied_node)
                changed.append(node)

    return Response({
        "original": ReadOnlySimplifiedContentNodeSerializer(original, many=True).data,
        "changed": ReadOnlySimplifiedContentNodeSerializer(changed, many=True).data,
    })


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['POST'])
def create_new_node(request):
    data = request.data
    license = License.objects.filter(license_name=data.get('license_name')).first()  # Use filter/first in case preference hasn't been set
    license_id = license.pk if license else settings.DEFAULT_LICENSE
    new_node = ContentNode.objects.create(
        kind_id=data.get('kind'),
        title=data.get('title'),
        author=data.get('author'),
        aggregator=data.get('aggregator'),
        provider=data.get('provider'),
        copyright_holder=data.get('copyright_holder'),
        license_id=license_id,
        license_description=data.get('license_description'),
        parent_id=settings.ORPHANAGE_ROOT_ID,
    )
    return Response(ContentNodeEditSerializer(new_node).data)


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['GET'])
def get_prerequisites(request, get_postrequisites, ids):
    nodes = ContentNode.objects.prefetch_related('prerequisite').filter(pk__in=ids.split(","))
    try:
        request.user.can_view_nodes(nodes)
    except PermissionDenied:
        return HttpResponseNotFound("No prerequisites found for {}".format(ids))

    prerequisite_mapping = {}
    postrequisite_mapping = {}
    prerequisite_tree_nodes = []

    for n in nodes:
        prereqs, prereqmapping = n.get_prerequisites()
        if get_postrequisites == "true":
            postreqs, postreqmapping = n.get_postrequisites()
            postrequisite_mapping.update(postreqmapping)
            prerequisite_mapping.update(prereqmapping)
            prerequisite_tree_nodes += prereqs + postreqs + [n]
        else:
            prerequisite_mapping.update({n.pk: prereqmapping})
            prerequisite_tree_nodes += prereqs + [n]

    return Response({
        "prerequisite_mapping": prerequisite_mapping,
        "postrequisite_mapping": postrequisite_mapping,
        "prerequisite_tree_nodes": ReadOnlySimplifiedContentNodeSerializer(prerequisite_tree_nodes, many=True).data,
    })


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['GET'])
def get_total_size(request, ids):
    nodes = ContentNode.objects.prefetch_related('assessment_items', 'files', 'children')\
                       .exclude(kind_id=content_kinds.EXERCISE, published=False)\
                       .filter(id__in=ids.split(",")).get_descendants(include_self=True)\
                       .values('files__checksum', 'files__file_size')\
                       .distinct()
    try:
        request.user.can_view_nodes(nodes)
    except PermissionDenied:
        return HttpResponseNotFound("No nodes found for {}".format(ids))
    sizes = nodes.aggregate(resource_size=Sum('files__file_size'))

    return Response({'success': True, 'size': sizes['resource_size'] or 0})


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['GET'])
def get_nodes_by_ids(request, ids):
    nodes = ContentNode.objects.prefetch_related(
                            'children',
                            'files',
                            'assessment_items',
                            'tags',
                            'prerequisite',
                            'license',
                            'slideshow_slides',
                            'is_prerequisite_of'
                        )\
                       .filter(pk__in=ids.split(","))\
                       .defer('node_id', 'original_source_node_id', 'source_node_id', 'content_id',
                              'original_channel_id', 'source_channel_id', 'source_id', 'source_domain', 'created', 'modified')
    try:
        request.user.can_view_nodes(nodes)
    except PermissionDenied:
        return HttpResponseNotFound("No nodes found for {}".format(ids))
    serializer = ReadOnlyContentNodeSerializer(nodes, many=True)
    return Response(serializer.data)


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['GET'])
def get_node_path(request, topic_id, tree_id, node_id):
    try:
        topic = ContentNode.objects.prefetch_related('children').get(node_id__startswith=topic_id, tree_id=tree_id)
        try:
            request.user.can_view_node(topic)
        except PermissionDenied:
            return HttpResponseNotFound("No topic found for {}".format(topic_id))

        if topic.kind_id != content_kinds.TOPIC:
            node = ContentNode.objects.prefetch_related('files', 'assessment_items', 'tags').get(node_id__startswith=topic_id, tree_id=tree_id)
            nodes = node.get_ancestors(ascending=True)
        else:
            node = node_id and ContentNode.objects.prefetch_related('files', 'assessment_items', 'tags').get(node_id__startswith=node_id, tree_id=tree_id)
            nodes = topic.get_ancestors(include_self=True, ascending=True)

        return Response({
            'path': ReadOnlyContentNodeSerializer(nodes, many=True).data,
            'node': node and ReadOnlyContentNodeFullSerializer(node).data,
            'parent_node_id': topic.kind_id != content_kinds.TOPIC and node.parent and node.parent.node_id
        })
    except ObjectDoesNotExist:
        return HttpResponseNotFound("Invalid URL: the referenced content does not exist in this channel.")


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['GET'])
def get_nodes_by_ids_simplified(request, ids):
    nodes = ContentNode.objects.prefetch_related('children').filter(pk__in=ids.split(","))
    try:
        request.user.can_view_nodes(nodes)
    except PermissionDenied:
        return HttpResponseNotFound("No nodes found for {}".format(ids))
    serializer = ReadOnlySimplifiedContentNodeSerializer(nodes, many=True)
    return Response(serializer.data)


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['GET'])
def get_nodes_by_ids_complete(request, ids):
    nodes = ContentNode.objects.prefetch_related('children', 'files', 'assessment_items', 'tags').filter(pk__in=ids.split(","))
    try:
        request.user.can_view_nodes(nodes)
    except PermissionDenied:
        return HttpResponseNotFound("No nodes found for {}".format(ids))
    serializer = ReadOnlyContentNodeFullSerializer(nodes, many=True)
    return Response(serializer.data)


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['GET'])
def get_topic_details(request, contentnode_id):
    """ Generates data for topic contents. Used for look-inside previews
        Keyword arguments:
            contentnode_id (str): id of topic node to get details from
    """
    # Get nodes and channel
    node = ContentNode.objects.get(pk=contentnode_id)
    try:
        request.user.can_view_node(node)
    except PermissionDenied:
        return HttpResponseNotFound("No topic found for {}".format(contentnode_id))
    data = get_node_details_cached(node)
    return HttpResponse(json.dumps(data))


def get_node_details_cached(node):
    cached_data = cache.get("details_{}".format(node.node_id))

    if cached_data:
        descendants = node.get_descendants().prefetch_related('children', 'files', 'tags') \
            .select_related('license', 'language')
        channel = node.get_channel()

        # If channel is a sushi chef channel, use date created for faster query
        # Otherwise, find the last time anything was updated in the channel
        last_update = channel.main_tree.created if channel and channel.ricecooker_version else \
            descendants.filter(changed=True) \
            .aggregate(latest_update=Max('modified')) \
            .get('latest_update')

        if last_update:
            last_cache_update = datetime.strptime(json.loads(cached_data)['last_update'], settings.DATE_TIME_FORMAT)
            if last_update.replace(tzinfo=None) > last_cache_update:
                # update the stats async, then return the cached value
                getnodedetails_task.apply_async((node.pk,))
        return json.loads(cached_data)

    return node.get_details()


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['POST'])
def delete_nodes(request):

    data = request.data

    try:
        nodes = data["nodes"]
        channel_id = data["channel_id"]
        try:
            request.user.can_edit(channel_id)
            nodes = ContentNode.objects.filter(pk__in=nodes)
            request.user.can_edit_nodes(nodes)
        except PermissionDenied:
            return HttpResponseNotFound("Resources not found to delete")
        for node in nodes:
            if node.parent and not node.parent.changed:
                node.parent.changed = True
                node.parent.save()
            node.delete()

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

    return Response({'success': True})


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['POST'])
def duplicate_nodes(request):
    logging.debug("Entering the copy_node endpoint")

    data = request.data

    try:
        node_ids = data["node_ids"]
        sort_order = data.get("sort_order") or 1
        channel_id = data["channel_id"]
        target_parent = ContentNode.objects.get(pk=data["target_parent"])
        channel = target_parent.get_channel()
        try:
            request.user.can_edit(channel and channel.pk)
        except PermissionDenied:
            return HttpResponseNotFound("No channel matching: {}".format(channel and channel.pk))

        task_info = {
            'user': request.user,
            'metadata': {
                'affects': {
                    'channels': [channel_id],
                    'nodes': node_ids,
                }
            }
        }

        task_args = {
            'user_id': request.user.pk,
            'channel_id': channel_id,
            'target_parent': target_parent.pk,
            'node_ids': node_ids,
            'sort_order': sort_order
        }

        task, task_info = create_async_task('duplicate-nodes', task_info, task_args)
        return HttpResponse(JSONRenderer().render(TaskSerializer(task_info).data))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['POST'])
def duplicate_node_inline(request):
    logging.debug("Entering the dupllicate_node_inline endpoint")

    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = request.data

    try:
        node_id = data["node_id"]
        channel_id = data["channel_id"]
        target_parent = ContentNode.objects.get(pk=data["target_parent"])
        channel = target_parent.get_channel()
        try:
            request.user.can_edit(channel and channel.pk)
        except PermissionDenied:
            return HttpResponseNotFound("No channel matching: {}".format(channel and channel.pk))

        task_info = {
            'user': request.user,
            'metadata': {
                'affects': {
                    'channels': [channel_id],
                    'nodes': [node_id],
                }
            }
        }

        task_args = {
            'user_id': request.user.pk,
            'channel_id': channel_id,
            'target_parent': target_parent.pk,
            'node_id': node_id,
        }

        task, task_info = create_async_task('duplicate-node-inline', task_info, task_args)
        return Response(TaskSerializer(task_info).data)
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['POST'])
def move_nodes(request):
    logging.debug("Entering the move_nodes endpoint")

    data = request.data

    try:
        nodes = data["nodes"]
        target_parent = ContentNode.objects.get(pk=data["target_parent"])
        channel_id = data["channel_id"]
        min_order = data.get("min_order") or 0
        max_order = data.get("max_order") or min_order + len(nodes)

        channel = target_parent.get_channel()
        try:
            request.user.can_edit(channel and channel.pk)
            request.user.can_edit_nodes(ContentNode.objects.filter(id__in=list(n["id"] for n in nodes)))
        except PermissionDenied:
            return HttpResponseNotFound("Resources not found")

        task_info = {
            'user': request.user,
            'metadata': {
                'affects': {
                    'channels': [channel_id],
                    'nodes': nodes,
                }
            }
        }

        task_args = {
            'user_id': request.user.pk,
            'channel_id': channel_id,
            'node_ids': nodes,
            'target_parent': data["target_parent"],
            'min_order': min_order,
            'max_order': max_order
        }

        task, task_info = create_async_task('move-nodes', task_info, task_args)
        return HttpResponse(JSONRenderer().render(TaskSerializer(task_info).data))

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['POST'])
def sync_nodes(request):
    logging.debug("Entering the sync_nodes endpoint")

    data = request.data

    try:
        nodes = data["nodes"]
        channel_id = data['channel_id']
        try:
            request.user.can_edit(channel_id)
            request.user.can_edit_nodes(ContentNode.objects.filter(id__in=list(n["id"] for n in nodes)))
        except PermissionDenied:
            return HttpResponseNotFound("Resources not found")

        task_info = {
            'user': request.user,
            'metadata': {
                'affects': {
                    'channels': [channel_id],
                    'nodes': nodes,
                }
            }
        }

        task_args = {
            'user_id': request.user.pk,
            'channel_id': channel_id,
            'node_ids': nodes,
            'sync_attributes': True,
            'sync_tags': True,
            'sync_files': True,
            'sync_assessment_items': True,
        }

        task, task_info = create_async_task('sync-nodes', task_info, task_args)
        return HttpResponse(JSONRenderer().render(TaskSerializer(task_info).data))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(['POST'])
def sync_channel_endpoint(request):
    logging.debug("Entering the sync_nodes endpoint")

    data = request.data

    try:
        channel_id = data['channel_id']

        try:
            request.user.can_edit(channel_id)
        except PermissionDenied:
            return HttpResponseNotFound("No channel matching: {}".format(channel_id))

        task_info = {
            'user': request.user,
            'metadata': {
                'affects': {
                    'channels': [channel_id],
                }
            }
        }

        task_args = {
            'user_id': request.user.pk,
            'channel_id': channel_id,
            'sync_attributes': data.get('attributes'),
            'sync_tags': data.get('tags'),
            'sync_files': data.get('files'),
            'sync_assessment_items': data.get('assessment_items'),
            'sync_sort_order': data.get('sort'),
        }

        task, task_info = create_async_task('sync-channel', task_info, task_args)
        return HttpResponse(JSONRenderer().render(TaskSerializer(task_info).data))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
