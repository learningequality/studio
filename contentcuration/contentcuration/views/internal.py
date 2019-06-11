import json
import logging
from collections import namedtuple
from distutils.version import LooseVersion

from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.core.exceptions import SuspiciousOperation
from django.core.management import call_command
from django.db import transaction
from django.http import HttpResponseBadRequest
from django.http import HttpResponseForbidden
from django.http import HttpResponseNotFound
from django.http import HttpResponseServerError
from django.http import JsonResponse
from le_utils.constants import content_kinds
from le_utils.constants import roles
from raven.contrib.django.raven_compat.models import client
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from itertools import chain
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration import ricecooker_versions as rc
from contentcuration.api import activate_channel
from contentcuration.api import get_staged_diff
from contentcuration.api import write_file_to_storage
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
# from contentcuration.models import CONTENT_METADATA_FIELDS
from contentcuration.models import get_next_sort_order
from contentcuration.models import License
from contentcuration.models import SlideshowSlide
from contentcuration.models import StagedFile
from contentcuration.serializers import GetTreeDataSerializer
from contentcuration.utils.files import get_file_diff
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.utils.nodes import map_files_to_assessment_item
from contentcuration.utils.nodes import map_files_to_node
from contentcuration.utils.nodes import map_files_to_slideshow_slide_item
from contentcuration.utils.tracing import trace

VersionStatus = namedtuple('VersionStatus', ['version', 'status', 'message'])
VERSION_OK = VersionStatus(version=rc.VERSION_OK, status=0, message=rc.VERSION_OK_MESSAGE)
VERSION_SOFT_WARNING = VersionStatus(version=rc.VERSION_SOFT_WARNING, status=1, message=rc.VERSION_SOFT_WARNING_MESSAGE)
VERSION_HARD_WARNING = VersionStatus(version=rc.VERSION_HARD_WARNING, status=2, message=rc.VERSION_HARD_WARNING_MESSAGE)
VERSION_ERROR = VersionStatus(version=rc.VERSION_ERROR, status=3, message=rc.VERSION_ERROR_MESSAGE)

# Used to get diff between nodes
CONTENT_METADATA_FIELDS = ["title", "description", "license_id", "license_description", "language_id", "copyright_holder",
                    "extra_fields", "author", "aggregator", "provider", "role_visibility", "kind_id", "content_id"]
ASSESSMENT_EDIT_FIELDS = ['assessment_id', 'type', 'question', 'hints', 'answers', 'order', 'raw_data', 'source_url', 'randomize']
FILE_EDIT_FIELDS = ["checksum", "preset_id", "language_id", "source_url", "file_format_id"]


def handle_server_error(request):
    client.captureException(stack=True, tags={'url': request.path})


@api_view(['POST', 'GET'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def authenticate_user_internal(request):
    """ Verify user is valid """
    logging.debug("Logging in user")
    return Response({
        'success': True,
        'user_id': request.user.id,
        'username': unicode(request.user),
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'is_admin': request.user.is_admin,
    })


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def check_version(request):
    """ Get version of Ricecooker with which CC is compatible """
    try:
        logging.debug("Entering the check_version endpoint")
        version = json.loads(request.body)['version']
        status = None

        if LooseVersion(version) >= LooseVersion(VERSION_OK[0]):
            status = VERSION_OK
        elif LooseVersion(version) >= LooseVersion(VERSION_SOFT_WARNING[0]):
            status = VERSION_SOFT_WARNING
        elif LooseVersion(version) >= LooseVersion(VERSION_HARD_WARNING[0]):
            status = VERSION_HARD_WARNING
        else:
            status = VERSION_ERROR

        return JsonResponse({
            'success': True,
            'status': status[1],
            'message': status[2].format(version, VERSION_OK[0]),
        })
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def file_diff(request):
    """ Determine which files don't exist on server """
    try:
        logging.debug("Entering the file_diff endpoint")
        data = json.loads(request.body)

        # Might want to use this once assumption that file exists is true (save on performance)
        # in_db_list = File.objects.annotate(filename=Concat('checksum', Value('.'),  'file_format'))
        #                          .filter(filename__in=data).values_list('filename', flat=True)
        # for f in list(set(data) - set(in_db_list)):
        to_return = get_file_diff(data)

        return Response(to_return)
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_file_upload(request):
    """ Upload a file to the storage system """
    try:
        fobj = request.FILES["file"]
        checksum, ext = fobj._name.split(".")
        try:
            request.user.check_staged_space(fobj._size, checksum)
        except Exception as e:
            return HttpResponseForbidden(str(e))

        write_file_to_storage(fobj, check_valid=True)
        StagedFile.objects.get_or_create(
            checksum=checksum,
            file_size=fobj._size,
            uploaded_by=request.user
        )

        return Response({
            "success": True,
        })
    except KeyError:
        return HttpResponseBadRequest("Invalid file upload request")
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_create_channel_endpoint(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        channel_data = data['channel_data']

        obj = create_channel(channel_data, request.user)

        return Response({
            "success": True,
            "root": obj.chef_tree.pk,
            "channel_id": obj.pk,
        })
    except KeyError as e:
        return HttpResponseBadRequest("Required attribute missing: {}".format(e.message))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_commit_channel(request):
    """
    Commit the channel chef_tree to staging tree to the main tree.
    This view backs the endpoint `/api/internal/finish_channel` called by ricecooker.
    """
    data = json.loads(request.body)
    try:
        channel_id = data['channel_id']

        request.user.can_edit(channel_id)

        obj = Channel.objects.get(pk=channel_id)

        # Need to rebuild MPTT tree pointers since we used `disable_mptt_updates`
        ContentNode.objects.partial_rebuild(obj.chef_tree.tree_id)
        # set original_channel_id and source_channel_id to self since chef tree
        obj.chef_tree.get_descendants(include_self=True).update(original_channel_id=channel_id,
                                                                source_channel_id=channel_id)

        # replace staging_tree with chef_tree
        old_staging = obj.staging_tree
        obj.staging_tree = obj.chef_tree
        obj.chef_tree = None
        obj.save()

        # Mark old staging tree for garbage collection
        if old_staging and old_staging != obj.main_tree:
            # IMPORTANT: Do not remove this block, MPTT updating the deleted chefs block could hang the server
            with ContentNode.objects.disable_mptt_updates():
                garbage_node = get_deleted_chefs_root()
                old_staging.parent = garbage_node
                old_staging.title = "Old staging tree for channel {}".format(obj.pk)
                old_staging.save()

        # If ricecooker --stage flag used, we're done (skip ACTIVATE step), else
        # we ACTIVATE the channel, i.e., set the main tree from the staged tree
        if not data.get('stage'):
            try:
                activate_channel(obj, request.user)
            except PermissionDenied as e:
                return Response(str(e), status=e.status_code)

        return Response({
            "success": True,
            "new_channel": obj.pk,
        })
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    except KeyError as e:
        return HttpResponseBadRequest("Required attribute missing: {}".format(e.message))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_add_nodes_to_tree(request):
    """
    Add the nodes from the `content_data` (list) as children to the parent node
    whose pk is specified in `root_id`. The list `content_data` conatins json
    dicts obtained from the to_dict serializarion of the ricecooker node class.

    Response is of the form
    ```
        { "success": bool,
          "root_ids": [
                  "<node1_node_id>": "node1_pk",
                  "<node2_node_id>": "node2_pk",
                  ...
          ]}
    ```
    """
    data = json.loads(request.body)
    try:
        content_data = data['content_data']
        parent_id = data['root_id']
        node = ContentNode.objects.get(id=parent_id)
        request.user.can_edit_node(node)
        with ContentNode.objects.disable_mptt_updates():
            return Response({
                "success": True,
                "root_ids": convert_data_to_nodes(request.user, content_data, parent_id)
            })
    except (ContentNode.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No content matching: {}".format(parent_id))
    except KeyError as e:
        return HttpResponseBadRequest("Required attribute missing: {}".format(e.message))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_publish_channel(request):
    logging.debug("Entering the publish_channel endpoint")
    data = json.loads(request.body)

    try:
        channel_id = data["channel_id"]
        # Ensure that the user has permission to edit this channel.
        request.user.can_edit(channel_id)
        call_command("exportchannel", channel_id, user_id=request.user.pk)

        return Response({
            "success": True,
            "channel": channel_id
        })
    except (KeyError, Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No channel matching: {}".format(data))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_staged_diff_internal(request):
    try:
        channel_id = json.loads(request.body)['channel_id']
        request.user.can_edit(channel_id)
        return Response(get_staged_diff(channel_id))
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def activate_channel_internal(request):
    try:
        data = json.loads(request.body)
        channel_id = data['channel_id']
        request.user.can_edit(channel_id)
        channel = Channel.objects.get(pk=channel_id)
        activate_channel(channel, request.user)
        return Response({"success": True})
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def check_user_is_editor(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        channel_id = data['channel_id']
        try:
            request.user.can_edit(channel_id)
            return Response({"success": True})
        except PermissionDenied:
            return HttpResponseNotFound("Channel not found {}".format(channel_id))

    except KeyError:
        raise HttpResponseBadRequest("Missing attribute from data: {}".format(data))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_tree_data(request):
    """
    Get the tree data for the `tree` tree of channel `channel_id`.
    WARNING: this endpoint timesouts for large channels.
    Returns { success: true, tree:[ nodes in channel_id ] }
    """
    serializer = GetTreeDataSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        channel_id = serializer.validated_data['channel_id']
        request.user.can_edit(channel_id)
        channel = Channel.objects.get(pk=channel_id)
        tree_name = "{}_tree".format(serializer.validated_data['tree'])
        tree_root = getattr(channel, tree_name, None)
        if tree_root is None:
            raise ValueError("Invalid tree name")
        tree_data = tree_root.get_tree_data()
        children_data = tree_data.get('children', [])
        return Response({"success": True, 'tree': children_data})
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    except ValueError:
        return HttpResponseNotFound("No tree name matching: {}".format(tree_name))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_node_tree_data(request):
    """
    Get one level of children data for for the node `node_id` of
    the `tree` tree associated with channel `data['channel_id']`.
    Returns { success: true, tree:[ children of node_id ] }
    """
    serializer = GetTreeDataSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        channel_id = serializer.validated_data['channel_id']
        request.user.can_edit(channel_id)
        channel = Channel.objects.get(pk=channel_id)
        tree_name = "{}_tree".format(serializer.validated_data['tree'])
        tree_root = getattr(channel, tree_name, None)
        if 'node_id' in serializer.validated_data:
            node = tree_root.get_descendants().filter(node_id=serializer.validated_data['node_id']).first()
        else:
            node = tree_root
        tree_data = node.get_tree_data(levels=1)
        children_data = tree_data.get('children', [])
        response_data = {
            'success': True,
            'tree': children_data,
            'staged': channel.staging_tree is not None
        }
        return Response(response_data)
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_channel_status_bulk(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        channel_ids = data['channel_ids']
        for cid in channel_ids:
            request.user.can_edit(cid)
        statuses = {cid: get_status(cid) for cid in data['channel_ids']}

        return Response({
            "success": True,
            'statuses': statuses,
        })
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No complete set of channels matching: {}".format(",".join(channel_ids)))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        handle_server_error(request)
        return HttpResponseServerError(content=str(e), reason=str(e))


def get_status(channel_id):
    obj = Channel.objects.filter(pk=channel_id).first()
    if not obj:
        return "active"
    elif obj.deleted:
        return "deleted"
    elif obj.staging_tree:
        return "staged"
    elif obj.main_tree.get_descendants().filter(changed=True).exists():
        return"unpublished"
    return "active"

@api_view(['GET'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_full_node_diff_endpoint(request, channel_id):
    channel = Channel.objects.get(pk=channel_id)
    return HttpResponse(json.dumps(get_full_node_diff(channel)))

def get_full_node_diff(channel):
    """ Create dict of differences between main and staging trees
        Example: {
            "nodes_modified": [
                "<node_id (str)>": {
                    "attributes": {
                        "title": {
                            "changed": (bool),
                            "value": (str)
                        },
                        "files": ([{
                            "filename": (str),
                            "file_size": (int),
                            "preset": (str)
                        }]),
                        "assessment_items": ([AssessmentItem]),
                        "tags": ([Tag]),
                        ...
                    }
                },
                ...
            ],
            "nodes_added": [
                "<node_id (str)>": { "new_parent": (str),  "attributes": {...}},
                ...
            ],
            "nodes_deleted": [
                "<node_id (str)>": {"old_parent": (str), "attributes": {...}},
                ...
            ],
            "nodes_moved": [
                "<node_id (str)>": {"old_parent": (str), "new_parent": (str), "attributes": {...}},
                ...
            ]
        }


        Determining if node is added/moved/removed:

        Node id captures whether or not the (parent node_id, node_id) edge exists
        # Main = # of times content id is in main tree
        # Staged = # of times content id is in staging tree
        node_id_diff = union(Main node ids, Staged node ids) - intersection(Main node ids, Staged node ids)

         # Main = # Staged | # Main > # Staged       | # Main < # Staged
        ----------------------------------------------------------------
         All nodes in      | (# Main - # Staged)     | (# Staged - # Main)
         node_id_diff      | have been removed,      | have been added,
         have moved        | (# Staged -             | (# Staged -
                           | len(node_intersection)) |    len(node_intersection))
                           | have moved              | have moved
    """
    diff = {
        "nodes_added": {},
        "nodes_deleted": {},
        "nodes_modified": {},
        "nodes_moved": {}
    }

    staged_descendants = channel.staging_tree.get_descendants()
    main_descendants = channel.main_tree.get_descendants()
    changed_nodes = staged_descendants.filter(changed=True)

    # Go through all changed nodes
    for node in changed_nodes:
        # Get all changed fields
        if node.changed_staging_fields:
            diff['nodes_modified'].update({
                node.node_id: node.changed_staging_fields
            })

    # TODO: Once upgraded to Django 1.11, use difference and intersection
    # see https://docs.djangoproject.com/en/1.11/ref/models/querysets/#django.db.models.query.QuerySet.difference
    staged_content_ids = staged_descendants.values_list('content_id', flat=True)
    main_content_ids = main_descendants.values_list('content_id', flat=True)
    for content_id in list(set(chain(staged_content_ids, main_content_ids))):
        # Get nodes associated to the content id
        main_nodes = main_descendants.filter(content_id=content_id)
        main_node_ids = main_nodes.values_list('node_id', flat=True)
        staged_nodes = staged_descendants.filter(content_id=content_id).order_by('changed')

        node_intersection = staged_nodes.filter(node_id__in=main_node_ids).values_list('node_id', flat=True)
        staged_nodes_diff = staged_nodes.exclude(node_id__in=node_intersection)
        main_nodes_diff = main_nodes.exclude(node_id__in=node_intersection)

        count_difference = main_nodes.count() - staged_nodes.count()
        if count_difference > 0:
            # Nodes have been deleted on the staging tree
            for deleted in main_nodes_diff.reverse()[:count_difference]:
                diff['nodes_deleted'].update({
                    deleted.node_id: {
                        "old_parent": deleted.parent.node_id,
                        "attributes": get_node_dict(deleted),
                    }
                })

        elif count_difference < 0:
            # Nodes have been added on the staging tree
            for added in staged_nodes_diff.reverse()[:abs(count_difference)]:
                diff['nodes_added'].update({
                    added.node_id: {
                        "old_parent": added.parent.node_id,
                        "attributes": get_node_dict(added)
                    }
                })

        # Handle moved nodes
        min_index = min(main_nodes.count(), staged_nodes.count())
        for index in range(min_index - node_intersection.count()):
            main_moved_node = main_nodes_diff[index]
            staged_moved_node = staged_nodes_diff[index]

            diff['nodes_moved'].update({
                staged_moved_node.node_id: {
                    "old_parent": main_moved_node.parent.node_id,
                    "new_parent": staged_moved_node.parent.node_id,
                    "old_node_id": main_moved_node.node_id,
                    "attributes": get_node_diff(staged_moved_node, main_moved_node),
                }
            })

    return diff


def get_node_dict(node):
    data = { field: getattr(node, field) for field in CONTENT_METADATA_FIELDS }
    data.update({"files": list(node.files.values(*FILE_EDIT_FIELDS))})
    data.update({"assessment_items": list(node.assessment_items.values(*ASSESSMENT_EDIT_FIELDS))})
    data.update({"tags": list(node.tags.values_list('tag_name', flat=True))})
    return data


# CHANNEL CREATE FUNCTIONS
def create_channel(channel_data, user):
    """ Set up channel """
    # Set up initial channel
    channel, isNew = Channel.objects.get_or_create(id=channel_data['id'])

    # Add user as editor if channel is new or channel has no editors
    # Otherwise, check if user is an editor
    if isNew or channel.editors.count() == 0:
        channel.editors.add(user)
    elif user not in channel.editors.all():
        raise SuspiciousOperation("User is not authorized to edit this channel")

    channel.name = channel_data['name']
    channel.description = channel_data['description']
    channel.thumbnail = channel_data['thumbnail']
    channel.deleted = False
    channel.source_id = channel_data.get('source_id')
    channel.source_domain = channel_data.get('source_domain')
    channel.ricecooker_version = channel_data.get('ricecooker_version')
    channel.language_id = channel_data.get('language')

    old_chef_tree = channel.chef_tree
    is_published = channel.main_tree is not None and channel.main_tree.published
    # Set up initial staging tree
    channel.chef_tree = ContentNode.objects.create(
        title=channel.name,
        kind_id=content_kinds.TOPIC,
        sort_order=get_next_sort_order(),
        published=is_published,
        content_id=channel.id,
        node_id=channel.id,
        source_id=channel.source_id,
        source_domain=channel.source_domain,
        extra_fields={'ricecooker_version': channel.ricecooker_version},
    )
    channel.chef_tree.save()
    channel.save()

    # Delete chef tree if it already exists
    if old_chef_tree and old_chef_tree != channel.staging_tree:
        # IMPORTANT: Do not remove this block, MPTT updating the deleted chefs block could hang the server
        with ContentNode.objects.disable_mptt_updates():
            garbage_node = get_deleted_chefs_root()
            old_chef_tree.parent = garbage_node
            old_chef_tree.title = "Old chef tree for channel {}".format(channel.pk)
            old_chef_tree.save()

    return channel  # Return new channel


@trace
def convert_data_to_nodes(user, content_data, parent_node):
    """ Parse dict and create nodes accordingly """
    try:
        root_mapping = {}
        parent_node = ContentNode.objects.get(pk=parent_node)
        sort_order = parent_node.children.count() + 1
        existing_node_ids = ContentNode.objects.filter(parent_id=parent_node.pk).values_list('node_id', flat=True)
        channel = parent_node.get_channel()
        with transaction.atomic():
            for node_data in content_data:
                # Check if node id is already in the tree to avoid duplicates
                if node_data['node_id'] not in existing_node_ids:
                    # Create the node
                    new_node = create_node(node_data, parent_node, sort_order)

                    # Create files associated with node
                    map_files_to_node(user, new_node, node_data['files'])

                    # Create questions associated exercise nodes
                    create_exercises(user, new_node, node_data['questions'])

                    # Set any node differences
                    set_node_diff(new_node, channel)

                    sort_order += 1

                    # Create Slideshow slides (if slideshow kind)
                    if node_data['kind'] == 'slideshow':
                        extra_fields_unicode = node_data['extra_fields']

                        # Extra Fields comes as type<unicode> - convert it to a dict and get slideshow_data
                        extra_fields_json = extra_fields_unicode.encode("ascii", "ignore")
                        extra_fields = json.loads(extra_fields_json)

                        slides = create_slides(user, new_node, extra_fields.get('slideshow_data'))
                        map_files_to_slideshow_slide_item(user, new_node, slides, node_data["files"])

                    # Track mapping between newly created node and node id
                    root_mapping.update({node_data['node_id']: new_node.pk})
            return root_mapping

    except KeyError as e:
        raise ObjectDoesNotExist("Error creating node: {0}".format(e.message))

def create_node(node_data, parent_node, sort_order):
    """ Generate node based on node dict """
    # Make sure license is valid
    license = None
    license_name = node_data['license']
    if license_name is not None:
        try:
            license = License.objects.get(license_name__iexact=license_name)
        except ObjectDoesNotExist:
            raise ObjectDoesNotExist("Invalid license found")

    node = ContentNode.objects.create(
        title=node_data['title'],
        tree_id=parent_node.tree_id,
        kind_id=node_data['kind'],
        node_id=node_data['node_id'],
        content_id=node_data['content_id'],
        description=node_data['description'],
        author=node_data['author'],
        aggregator=node_data.get('aggregator') or "",
        provider=node_data.get('provider') or "",
        license=license,
        license_description=node_data.get('license_description'),
        copyright_holder=node_data.get('copyright_holder') or "",
        parent=parent_node,
        extra_fields=node_data['extra_fields'],
        sort_order=sort_order,
        source_id=node_data.get('source_id'),
        source_domain=node_data.get('source_domain'),
        language_id=node_data.get('language'),
        freeze_authoring_data=True,
        role_visibility=node_data.get('role') or roles.LEARNER,
    )
    tags = []
    channel = node.get_channel()
    if 'tags' in node_data:
        tag_data = node_data['tags']
        if tag_data is not None:
            for tag in tag_data:
                tags.append(ContentTag.objects.get_or_create(tag_name=tag, channel=channel)[0])

    if len(tags) > 0:
        node.tags = tags
        node.save()
    return node


def create_exercises(user, node, data):
    """ Generate exercise from data """
    with transaction.atomic():
        order = 0

        for question in data:
            question_obj = AssessmentItem(
                type=question.get('type'),
                question=question.get('question'),
                hints=question.get('hints'),
                answers=question.get('answers'),
                order=order,
                contentnode=node,
                assessment_id=question.get('assessment_id'),
                raw_data=question.get('raw_data'),
                source_url=question.get('source_url'),
                randomize=question.get('randomize') or False,
            )
            order += 1
            question_obj.save()
            map_files_to_assessment_item(user, question_obj, question['files'])


def create_slides(user, node, slideshow_data):
    """ Generate SlideshowSlides from data """
    """ Returns a collection of SlideshowSlide objects """

    slides = []

    with transaction.atomic():
        for slide in slideshow_data:
            slide_obj = SlideshowSlide(
                contentnode=node,
                sort_order=slide.get("sort_order"),
                metadata={
                    "caption": slide.get('caption'),
                    "descriptive_text": slide.get('descriptive_text'),
                    "checksum": slide.get('checksum'),
                    "extension": slide.get('extension')
                }
            )
            slide_obj.save()
            slides.append(slide_obj)

    return slides


#  Diff functions
################################################################################

def set_node_diff(node, channel):
    """ Get a dict of changed fields between the main tree and the staging tree, setting changed field accordingly """
    descendants = channel.main_tree.get_descendants().prefetch_related('files', 'tags', 'assessment_items').select_related("parent")

    # Determine if node is new or moved
    original_node = descendants.filter(node_id=node.node_id).first() # If this returns something, node is just modified
    if not original_node:
        copies = descendants.filter(content_id=node.content_id).exists() # If there are copies, the node was moved

    if original_node:
        node.changed_staging_fields = get_node_diff(node, original_node)

        # If there are any changes, set the changed attribute and save
        if node.changed_staging_fields.items():
            node.changed = True
            node.save()

def get_node_diff(node, original_node):
    # Check for metadata field changes
    changed_fields = {
        field: getattr(node, field)
        for field in CONTENT_METADATA_FIELDS
        if getattr(node, field) != getattr(original_node, field)
    }

    # Check for file changes
    file_diff = get_file_diff2(node, original_node)
    if file_diff.items():
        changed_fields.update({"files": file_diff})

    # Check for tag changes
    tag_diff = get_tag_diff(node, original_node)
    if tag_diff.items():
        changed_fields.update({"tags": tag_diff})

    # Check for assessment_item changes
    ai_diff = get_assessment_item_diff(node, original_node)
    if ai_diff.items():
        changed_fields.update({"assessment_items": ai_diff})

    return changed_fields


def get_file_diff2(node, original_node):
    file_diff = {}

    # Get new files
    old_presets = original_node.files.values_list('preset_id', flat=True)
    new_files = node.files.exclude(preset_id__in=old_presets).values(*FILE_EDIT_FIELDS)
    if new_files:
        file_diff.update({"new": [dict(item) for item in new_files]})

    # Get modified files
    changed_files = []
    for f in node.files.filter(preset_id__in=old_presets):
        original_file = original_node.files.get(preset_id=f.preset_id)
        file_changes = {
            field: getattr(f, field)
            for field in FILE_EDIT_FIELDS
            if getattr(f, field) != getattr(original_file, field)
        }
        if file_changes.items():
            file_changes.update({"preset_id": f.preset_id})
            changed_files.append(file_changes)
    if changed_files:
        file_diff.update({"modified": changed_files})

    # Get deleted files
    new_presets = node.files.values_list('preset_id', flat=True)
    deleted_files = original_node.files.exclude(preset_id__in=new_presets).values(*FILE_EDIT_FIELDS)
    if deleted_files:
        file_diff.update({"deleted": [dict(item) for item in deleted_files]})

    return file_diff

def get_tag_diff(node, original_node):
    tag_diff = {}

    # Get added tags
    original_tag_names = original_node.tags.values_list('tag_name', flat=True)
    new_tags = node.tags.exclude(tag_name__in=original_tag_names).values_list('tag_name', flat=True)
    if new_tags:
        tag_diff.update({"new": list(new_tags)})

    # Get deleted tags
    new_tag_names = node.tags.values_list('tag_name', flat=True)
    deleted_tags = original_node.tags.exclude(tag_name__in=new_tag_names).values_list('tag_name', flat=True)
    if deleted_tags:
        tag_diff.update({"deleted": list(deleted_tags)})

    return tag_diff

def get_assessment_item_diff(node, original_node):
    ai_diff = {}

    # Only check exercises
    if node.kind_id != content_kinds.EXERCISE:
        return ai_diff

    # Get new assessment items
    old_ais = original_node.assessment_items.values_list('assessment_id', flat=True)
    new_ais = node.assessment_items.exclude(assessment_id__in=old_ais).values(*ASSESSMENT_EDIT_FIELDS)
    if new_ais:
        ai_diff.update({"new": [dict(item) for item in new_ais]})

    # Get modified assessment_items
    changed_ais = []
    for ai in node.assessment_items.filter(assessment_id__in=old_ais):
        original_ai = original_node.assessment_items.get(assessment_id=ai.assessment_id)
        ai_changes = {
            field: getattr(ai, field)
            for field in ASSESSMENT_EDIT_FIELDS
            if getattr(ai, field) != getattr(original_ai, field)
        }
        if ai_changes.items():
            ai_changes.update({"assessment_id": ai.assessment_id})
            changed_ais.append(ai_changes)
    if changed_ais:
        ai_diff.update({"modified": changed_ais})

    # Get deleted assessment_items
    new_ais = node.assessment_items.values_list('assessment_id', flat=True)
    deleted_ais = original_node.assessment_items.exclude(assessment_id__in=new_ais).values(*ASSESSMENT_EDIT_FIELDS)
    if deleted_ais:
        ai_diff.update({"deleted": [dict(item) for item in deleted_ais]})

    return ai_diff

