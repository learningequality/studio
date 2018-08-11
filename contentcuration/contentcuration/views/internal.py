import json
import logging
from collections import namedtuple
from distutils.version import LooseVersion

import os
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, SuspiciousOperation, PermissionDenied
from django.core.files import File as DjFile
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.db import transaction
from django.http import HttpResponse, HttpResponseServerError, HttpResponseForbidden
from le_utils.constants import content_kinds, roles
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from contentcuration import ricecooker_versions as rc
from contentcuration.api import get_staged_diff, write_file_to_storage, activate_channel, get_hash
from contentcuration.models import AssessmentItem, Channel, ContentNode, ContentTag, File, FormatPreset, Language, License, StagedFile, generate_object_storage_name, get_next_sort_order
from contentcuration.utils.tracing import trace
from contentcuration.utils.files import get_file_diff

VersionStatus = namedtuple('VersionStatus', ['version', 'status', 'message'])
VERSION_OK = VersionStatus(version=rc.VERSION_OK, status=0, message=rc.VERSION_OK_MESSAGE)
VERSION_SOFT_WARNING = VersionStatus(version=rc.VERSION_SOFT_WARNING, status=1, message=rc.VERSION_SOFT_WARNING_MESSAGE)
VERSION_HARD_WARNING = VersionStatus(version=rc.VERSION_HARD_WARNING, status=2, message=rc.VERSION_HARD_WARNING_MESSAGE)
VERSION_ERROR = VersionStatus(version=rc.VERSION_ERROR, status=3, message=rc.VERSION_ERROR_MESSAGE)


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def authenticate_user_internal(request):
    """ Verify user is valid """
    logging.debug("Logging in user")
    return HttpResponse(json.dumps({
        'success': True,
        'username': unicode(request.user),
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'is_admin': request.user.is_admin,
    }))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def check_version(request):
    """ Get version of Ricecooker with which CC is compatible """
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

    return HttpResponse(json.dumps({
        'success': True,
        'status': status[1],
        'message': status[2].format(version, VERSION_OK[0]),
    }))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def file_diff(request):
    """ Determine which files don't exist on server """
    try:
        logging.debug("Entering the file_diff endpoint")
        data = json.loads(request.body)

        # Might want to use this once assumption that file exists is true (save on performance)
        # in_db_list = File.objects.annotate(filename=Concat('checksum', Value('.'),  'file_format')).filter(filename__in=data).values_list('filename', flat=True)
        # for f in list(set(data) - set(in_db_list)):
        to_return = get_file_diff(data)

        return HttpResponse(json.dumps(to_return))
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

        formatted_filename = write_file_to_storage(fobj, check_valid=True)
        StagedFile.objects.get_or_create(
            checksum = checksum,
            file_size = fobj._size,
            uploaded_by = request.user
        )

        return HttpResponse(json.dumps({
            "success": True,
        }))
    except KeyError:
        raise SuspiciousOperation("Invalid file upload request")
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_channel_structure_upload(request):
    """
    Creates a channel based on the structure sent in the request.
    :param request: POST request containing the tree structure of a channel.
    :return: The channel_id of the newly created channel.
    """
    data = json.loads(request.body)
    try:
        channel_id = data['channel_id']
        channel_structure = data['channel_structure']

        new_channel = create_channel_from_structure(channel_id, channel_structure, request.user)

        if not data.get('stage'):  # If user says to stage rather than submit, skip changing trees at this step
            activate_channel(new_channel, request.user)

        return HttpResponse(json.dumps({
            'success': True,
            'channel_id': new_channel.pk,
        }))
    except KeyError:
        raise ObjectDoesNotExist('Missing attribute from data: {}'.format(data))
    except Exception as e:
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

        return HttpResponse(json.dumps({
            "success": True,
            "root": obj.chef_tree.pk,
            "channel_id": obj.pk,
        }))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_commit_channel(request):
    """ Commit the channel staging tree to the main tree """
    data = json.loads(request.body)
    try:
        channel_id = data['channel_id']

        obj = Channel.objects.get(pk=channel_id)

        # rebuild MPTT tree for this channel (since we set "disable_mptt_updates", and bulk_create doesn't trigger rebuild signals anyway)
        ContentNode.objects.partial_rebuild(obj.chef_tree.tree_id)
        obj.chef_tree.get_descendants(include_self=True).update(original_channel_id=channel_id,
                                                                source_channel_id=channel_id)

        old_staging = obj.staging_tree
        obj.staging_tree = obj.chef_tree
        obj.chef_tree = None
        obj.save()

        # Delete staging tree if it already exists
        if old_staging and old_staging != obj.main_tree:
            garbage_node = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)
            old_staging.parent = garbage_node
            old_staging.title = "Old staging tree for channel {}".format(obj.pk)
            old_staging.save()

        if not data.get('stage'):  # If user says to stage rather than submit, skip changing trees at this step
            try:
                activate_channel(obj, request.user)
            except PermissionDenied as e:
                return HttpResponseForbidden(str(e))

        return HttpResponse(json.dumps({
            "success": True,
            "new_channel": obj.pk,
        }))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_add_nodes_from_file(request):
    """
    Creates a channel based on the structure sent in the request.
    :param request: POST request containing the tree structure of a channel.
    :return: The channel_id of the newly created channel.
    """
    try:
        fobj = request.FILES["file"]
        data = json.loads(fobj.read())
        content_data = data['content_data']
        parent_id = data['root_id']
        with ContentNode.objects.disable_mptt_updates():
            return HttpResponse(json.dumps({
                "success": True,
                "root_ids": convert_data_to_nodes(content_data, parent_id)
            }))
    except KeyError:
        raise ObjectDoesNotExist('Missing attribute from data: {}'.format(data))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))

@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_add_nodes_to_tree(request):
    """ Add child nodes to a parent node """
    data = json.loads(request.body)
    try:
        content_data = data['content_data']
        parent_id = data['root_id']
        with ContentNode.objects.disable_mptt_updates():
            return HttpResponse(json.dumps({
                "success": True,
                "root_ids": convert_data_to_nodes(request.user, content_data, parent_id)
            }))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_publish_channel(request):
    logging.debug("Entering the publish_channel endpoint")
    data = json.loads(request.body)

    try:
        channel_id = data["channel_id"]
        call_command("exportchannel", channel_id, user_id=request.user.pk)

        return HttpResponse(json.dumps({
            "success": True,
            "channel": channel_id
        }))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_staged_diff_internal(request):
    try:
        return HttpResponse(json.dumps(get_staged_diff(json.loads(request.body)['channel_id'])))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def activate_channel_internal(request):
    try:
        data = json.loads(request.body)
        channel = Channel.objects.get(pk=data['channel_id'])
        activate_channel(channel, request.user)
        return HttpResponse(json.dumps({"success": True}))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def check_user_is_editor(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        obj = Channel.objects.get(pk=data['channel_id'])
        if obj.editors.filter(pk=request.user.pk).exists():
            return HttpResponse(json.dumps({"success": True}))
        else:
            return SuspiciousOperation("User is not authorized to edit this channel")

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def compare_trees(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        obj = Channel.objects.get(pk=data['channel_id'])
        check_staging = data.get('staging')

        comparison_tree = obj.staging_tree if check_staging else obj.main_tree
        if not comparison_tree or not obj.previous_tree:
            raise ValueError("Comparison Failed: Tree does not exist")

        node_ids = comparison_tree.get_descendants().values_list('node_id', flat=True)
        previous_node_ids = obj.previous_tree.get_descendants().values_list('node_id', flat=True)

        new_nodes = comparison_tree.get_descendants().exclude(node_id__in=previous_node_ids).values('node_id', 'title',
                                                                                                    'files__file_size',
                                                                                                    'kind_id')
        deleted_nodes = obj.previous_tree.get_descendants().exclude(node_id__in=node_ids).values('node_id', 'title',
                                                                                                 'files__file_size',
                                                                                                 'kind_id')

        new_node_mapping = {
            n['node_id']: {'title': n['title'], 'kind': n['kind_id'], 'file_size': n['files__file_size']} for n in
            new_nodes.all()}
        deleted_node_mapping = {
            n['node_id']: {'title': n['title'], 'kind': n['kind_id'], 'file_size': n['files__file_size']} for n in
            deleted_nodes.all()}

        return HttpResponse(json.dumps({"success": True, 'new': new_node_mapping, 'deleted': deleted_node_mapping}))

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_tree_data(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        obj = Channel.objects.get(pk=data['channel_id'])
        root = getattr(obj, "{}_tree".format(data.get('tree') or "main"), None)

        data = root.get_tree_data(include_self=False)

        return HttpResponse(json.dumps({"success": True, 'tree': data}))

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))

@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_node_tree_data(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        obj = Channel.objects.get(pk=data['channel_id'])
        root = obj.staging_tree or obj.main_tree
        node = root.get_descendants().filter(node_id=data['node_id']).first() if data.get('node_id') else root

        return HttpResponse(json.dumps({"success": True, 'tree': node.get_node_tree_data(), 'staged': obj.staging_tree != None}))

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))

@api_view(['POST'])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_channel_status_bulk(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        statuses = {cid: get_status(cid) for cid in data['channel_ids']}

        return HttpResponse(json.dumps({
            "success": True,
            'statuses': statuses,
        }))

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
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

""" CHANNEL CREATE FUNCTIONS """


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
        extra_fields=json.dumps({'ricecooker_version': channel.ricecooker_version}),
    )
    channel.chef_tree.save()
    channel.save()

    # Delete chef tree if it already exists
    if old_chef_tree and old_chef_tree != channel.staging_tree:
        garbage_node = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)
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
        with transaction.atomic():
            for node_data in content_data:
                # Check if node id is already in the tree to avoid duplicates
                if node_data['node_id'] not in existing_node_ids:
                    # Create the node
                    new_node = create_node(node_data, parent_node, sort_order)

                    # Create files associated with node
                    map_files_to_node(user, new_node, node_data['files'])

                    # Create questions associated with node
                    create_exercises(user, new_node, node_data['questions'])
                    sort_order += 1

                    # Track mapping between newly created node and node id
                    root_mapping.update({node_data['node_id']: new_node.pk})
            return root_mapping

    except KeyError as e:
        raise ObjectDoesNotExist("Error creating node: {0}".format(e.message))


def create_channel_from_structure(channel_id, channel_structure_dict, user):
    """ Set up channel """
    # Set up initial channel
    channel, isNew = Channel.objects.get_or_create(id=channel_id)

    # Add user as editor if channel is new or channel has no editors
    # Otherwise, check if user is an editor
    if isNew or channel.editors.count() == 0:
        channel.editors.add(user)
    elif user not in channel.editors.all():
        raise SuspiciousOperation("User is not authorized to edit this channel")

    if len(channel_structure_dict) != 1:
        logging.warning(
            "ROOT: Channel structure expected to have one entry, found {}.".format(len(channel_structure_dict)))
        raise ValidationError(
            "ROOT: Channel structure expected to have one entry, found {}.".format(len(channel_structure_dict)))

    is_published = channel.main_tree is not None and channel.main_tree.published
    old_staging = channel.staging_tree
    channel.staging_tree, channel_data = create_tree_from_structure(user, channel_structure_dict.items()[0], is_published)

    channel.name = channel_data['name']
    channel.description = channel_data['description']
    channel.thumbnail = channel_data['thumbnail']
    channel.deleted = False
    channel.source_id = channel_data.get('source_id')
    channel.source_domain = channel_data.get('source_domain')
    channel.ricecooker_version = channel_data.get('ricecooker_version')

    channel.save()

    # TODO: Memory leak?
    # Delete staging tree if it already exists
    if old_staging and old_staging != channel.main_tree:
        old_staging.delete()

    return channel  # Return new channel


def create_tree_from_structure(user, root_node_pair, is_published):
    file_name = root_node_pair[0]
    children = root_node_pair[1][1]

    child_sort_order = 0
    root_node, root_data = create_root_from_file(file_name, is_published)
    with transaction.atomic():
        with ContentNode.objects.disable_mptt_updates():
            for child_node_pair in children.items():
                fill_tree_from_structure(user, child_node_pair, root_node)
                child_sort_order += 1
    ContentNode.objects.partial_rebuild(root_node.tree_id)

    return root_node, root_data


def fill_tree_from_structure(user, cur_node_pair, parent_node):
    file_name = cur_node_pair[0]
    sort_order = cur_node_pair[1][0]
    children = cur_node_pair[1][1]

    cur_node = create_node_from_file(user, file_name, parent_node, sort_order)
    for child_node_pair in children.items():
        fill_tree_from_structure(child_node_pair, cur_node)


@trace
def create_root_from_file(file_name, is_published):
    node_data = get_node_data_from_file(file_name)

    return ContentNode.objects.create(
        title=node_data['name'],
        kind_id=content_kinds.TOPIC,
        published=is_published,
        content_id=node_data['id'],
        node_id=node_data['id'],
        source_id=node_data['source_id'],
        source_domain=node_data['source_domain'],
        extra_fields=json.dumps({'ricecooker_version': node_data['ricecooker_version']}),
        language_id=node_data.get('language'),
    ), node_data


@trace
def create_node_from_file(user, file_name, parent_node, sort_order):
    node_data = get_node_data_from_file(file_name)

    cur_node = ContentNode.objects.create(
        title=node_data['title'],
        tree_id=parent_node.tree_id,
        kind_id=node_data['kind'],
        node_id=node_data['node_id'],
        content_id=node_data['content_id'],
        description=node_data['description'],
        author=node_data['author'],
        aggregator=node_data.get('aggregator') or "",
        provider=node_data.get('provider') or "",
        license=node_data['license'],
        license_description=node_data['license_description'],
        copyright_holder=node_data['copyright_holder'] or "",
        parent=parent_node,
        extra_fields=node_data['extra_fields'],
        sort_order=sort_order,
        source_id=node_data['source_id'],
        source_domain=node_data['source_domain'],
        language_id=node_data.get('language'),
        role_visibility=node_data.get('role') or roles.LEARNER,
    )
    # Create files associated with node
    map_files_to_node(user, cur_node, node_data['files'])

    # Create questions associated with node
    create_exercises(cur_node, node_data['questions'])

    return cur_node

# TODO: Use one file to upload a map from node filename to node metadata, instead of a file for each Node
def get_node_data_from_file(file_name):
    file_path = generate_object_storage_name(file_name.split('.')[0], file_name)
    if not os.path.isfile(file_path):
        raise IOError('{} not found.'.format(file_path))

    with open(file_path, 'rb') as file_obj:
        node_data = json.loads(file_obj.read().decode('utf-8'))

    if node_data is None:
        raise IOError('{} is empty or could not be read.'.format(file_path))

    # Make sure license is valid
    license = None
    license_name = node_data['license']
    if license_name is not None:
        try:
            license = License.objects.get(license_name__iexact=license_name)
        except ObjectDoesNotExist:
            raise ObjectDoesNotExist('Invalid license found')

    node_data['license'] = license
    return node_data


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


def map_files_to_node(user, node, data):
    """ Generate files that reference the content node """

    # filter for file data that's not empty;
    valid_data = (d for d in data if d)

    for file_data in valid_data:
        file_name_parts = file_data['filename'].split(".")

        # Determine a preset if none is given
        kind_preset = None
        if file_data['preset'] is None:
            kind_preset = FormatPreset.objects.filter(kind=node.kind,
                                                      allowed_formats__extension__contains=file_name_parts[1],
                                                      display=True).first()
        else:
            kind_preset = FormatPreset.objects.get(id=file_data['preset'])

        file_path = generate_object_storage_name(file_name_parts[0], file_data['filename'])
        storage = default_storage
        if not storage.exists(file_path):
            return IOError('{} not found'.format(file_path))

        try:
            if file_data.get('language'):
                # TODO: Remove DB call per file?
                file_data['language'] = Language.objects.get(pk=file_data['language'])
        except ObjectDoesNotExist as e:
            invalid_lang = file_data.get('language')
            logging.warning("file_data with language {} does not exist.".format(invalid_lang))
            return ValidationError("file_data given was invalid; expected string, got {}".format(invalid_lang))

        resource_obj = File(
            checksum=file_name_parts[0],
            contentnode=node,
            file_format_id=file_name_parts[1],
            original_filename=file_data.get('original_filename') or 'file',
            source_url=file_data.get('source_url'),
            file_size=file_data['size'],
            file_on_disk=DjFile(storage.open(file_path, 'rb')),
            preset=kind_preset,
            language_id=file_data.get('language'),
            uploaded_by=user,
        )
        resource_obj.file_on_disk.name = file_path
        resource_obj.save()


def map_files_to_assessment_item(user, question, data):
    """ Generate files that reference the content node's assessment items """
    for file_data in data:
        file_name_parts = file_data['filename'].split(".")
        file_path = generate_object_storage_name(file_name_parts[0], file_data['filename'])
        if not os.path.isfile(file_path):
            return IOError('{} not found'.format(file_path))

        resource_obj = File(
            checksum=file_name_parts[0],
            assessment_item=question,
            file_format_id=file_name_parts[1],
            original_filename=file_data.get('original_filename') or 'file',
            source_url=file_data.get('source_url'),
            file_size=file_data['size'],
            file_on_disk=DjFile(open(file_path, 'rb')),
            preset_id=file_data['preset'],
            uploaded_by=user,
        )
        resource_obj.file_on_disk.name = file_path
        resource_obj.save()


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
