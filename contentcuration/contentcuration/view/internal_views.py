import json
import logging
import os
import re
import shutil
import hashlib
from distutils.version import LooseVersion
from django.http import Http404, HttpResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404, redirect, render_to_response
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, SuspiciousOperation
from django.core.context_processors import csrf
from django.core.management import call_command
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import render_to_string
from contentcuration.api import write_file_to_storage
from contentcuration.models import Exercise, AssessmentItem, Channel, License, FileFormat, File, FormatPreset, ContentKind, ContentNode, ContentTag, Invitation, Language, generate_file_on_disk_name
from contentcuration import ricecooker_versions as rc
from le_utils.constants import content_kinds
from django.db.models.functions import Concat
from django.core.files import File as DjFile
from django.db.models import Q, Value
from django.db import transaction
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from collections import namedtuple

VersionStatus = namedtuple('VersionStatus', ['version', 'status', 'message'])
VERSION_OK = VersionStatus(version=rc.VERSION_OK, status=0, message=rc.VERSION_OK_MESSAGE)
VERSION_SOFT_WARNING = VersionStatus(version=rc.VERSION_SOFT_WARNING, status=1, message=rc.VERSION_SOFT_WARNING_MESSAGE)
VERSION_HARD_WARNING = VersionStatus(version=rc.VERSION_HARD_WARNING, status=2, message=rc.VERSION_HARD_WARNING_MESSAGE)
VERSION_ERROR = VersionStatus(version=rc.VERSION_ERROR, status=3, message=rc.VERSION_ERROR_MESSAGE)

@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def authenticate_user_internal(request):
    """ Verify user is valid """
    logging.debug("Logging in user")
    return HttpResponse(json.dumps({'success': True, 'username':unicode(request.user)}))

@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
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
        'status':status[1],
        'message':status[2].format(version, VERSION_OK[0]),
    }))

@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def file_diff(request):
    """ Determine which files don't exist on server """
    logging.debug("Entering the file_diff endpoint")
    data = json.loads(request.body)
    to_return = []

    # Might want to use this once assumption that file exists is true (save on performance)
    # in_db_list = File.objects.annotate(filename=Concat('checksum', Value('.'),  'file_format')).filter(filename__in=data).values_list('filename', flat=True)
    # for f in list(set(data) - set(in_db_list)):

    # Add files that don't exist in storage
    for f in data:
        file_path = generate_file_on_disk_name(os.path.splitext(f)[0],f)
        # Add file if it doesn't already exist
        if not os.path.isfile(file_path) or os.path.getsize(file_path) == 0:
            to_return.append(f)

    return HttpResponse(json.dumps(to_return))

@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_file_upload(request):
    """ Upload a file to the storage system """
    try:
        fobj = request.FILES["file"]
        formatted_filename = write_file_to_storage(fobj, check_valid=True)

        return HttpResponse(json.dumps({
            "success": True,
        }))
    except KeyError:
        raise SuspiciousOperation("Invalid file upload request")

@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_create_channel_endpoint(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        channel_data = data['channel_data']

        obj = create_channel(channel_data, request.user)

        return HttpResponse(json.dumps({
            "success": True,
            "root": obj.staging_tree.pk,
            "channel_id": obj.pk,
        }))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_commit_channel(request):
    """ Commit the channel staging tree to the main tree """
    data = json.loads(request.body)
    try:
        channel_id = data['channel_id']

        obj = Channel.objects.get(pk=channel_id)

        old_tree = obj.previous_tree
        obj.previous_tree = obj.main_tree
        obj.main_tree = obj.staging_tree
        obj.staging_tree = None
        obj.save()

        # Delete previous tree if it already exists
#         if old_tree:
#             with transaction.atomic():
#                 with ContentNode.objects.delay_mptt_updates():
#                     old_tree.delete()

        return HttpResponse(json.dumps({
            "success": True,
            "new_channel": obj.pk,
        }))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_add_nodes_to_tree(request):
    """ Add child nodes to a parent node """
    data = json.loads(request.body)
    try:
        content_data = data['content_data']
        parent_id = data['root_id']

        return HttpResponse(json.dumps({
            "success": True,
            "root_ids": convert_data_to_nodes(content_data, parent_id)
        }))
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

@api_view(['POST'])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_publish_channel(request):
    logging.debug("Entering the publish_channel endpoint")
    data = json.loads(request.body)

    try:
        channel_id = data["channel_id"]
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

    call_command("exportchannel", channel_id)

    return HttpResponse(json.dumps({
        "success": True,
        "channel": channel_id
    }))


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

    old_staging_tree = channel.staging_tree
    is_published = channel.main_tree is not None and channel.main_tree.published
    # Set up initial staging tree
    channel.staging_tree = ContentNode.objects.create(
        title = channel.name,
        kind_id = content_kinds.TOPIC,
        sort_order = 0,
        published = is_published,
        content_id = channel.id,
        node_id = channel.id,
        source_id = channel.source_id,
        source_domain = channel.source_domain,
    )
    channel.staging_tree.save()
    channel.save()

    # Delete staging tree if it already exists
    if old_staging_tree and old_staging_tree != channel.main_tree:
        old_staging_tree.delete()

    return channel # Return new channel

def convert_data_to_nodes(content_data, parent_node):
    """ Parse dict and create nodes accordingly """
    try:
        root_mapping = {}
        sort_order = ContentNode.objects.get(pk=parent_node).children.count() + 1
        existing_node_ids = parent.children.values_list('node_id', flat=True) if parent else []
        existing_node_ids = ContentNode.objects.filter(parent_id=parent_node).values_list('node_id', flat=True)

        with transaction.atomic():
            for node_data in content_data:
                # Check if node id is already in the tree to avoid duplicates
                if node_data['node_id'] not in existing_node_ids:
                    # Create the node
                    new_node = create_node(node_data, parent_node, sort_order)

                    # Create files associated with node
                    map_files_to_node(new_node, node_data['files'])

                    # Create questions associated with node
                    create_exercises(new_node, node_data['questions'])
                    sort_order += 1

                    # Track mapping between newly created node and node id
                    root_mapping.update({node_data['node_id'] : new_node.pk})
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

    return ContentNode.objects.create(
        title = node_data['title'],
        kind_id = node_data['kind'],
        node_id = node_data['node_id'],
        content_id = node_data['content_id'],
        description = node_data['description'],
        author = node_data['author'],
        license = license,
        license_description = node_data.get('license_description'),
        copyright_holder = node_data.get('copyright_holder') or "",
        parent_id = parent_node,
        extra_fields = node_data['extra_fields'],
        sort_order = sort_order,
        source_id = node_data.get('source_id'),
        source_domain = node_data.get('source_domain'),
    )

def map_files_to_node(node, data):
    """ Generate files that reference the content node """
    for file_data in data:
        file_hash = file_data['filename'].split(".")

        # Determine a preset if none is given
        kind_preset = None
        if file_data['preset'] is None:
            kind_preset = FormatPreset.objects.filter(kind=node.kind, allowed_formats__extension__contains=file_hash[1], display=True).first()
        else:
            kind_preset = FormatPreset.objects.get(id=file_data['preset'])

        language = None
        if file_data.get('language'):
            language = Language.objects.get(pk=file_data['language'])

        file_path=generate_file_on_disk_name(file_hash[0], file_data['filename'])
        if not os.path.isfile(file_path):
            raise IOError('{} not found'.format(file_path))

        file_obj = File(
            checksum=file_hash[0],
            contentnode=node,
            file_format_id=file_hash[1],
            original_filename=file_data.get('original_filename') or 'file',
            source_url=file_data.get('source_url'),
            file_size = file_data['size'],
            file_on_disk=DjFile(open(file_path, 'rb')),
            preset=kind_preset,
            language=language,
        )
        file_obj.save()

def map_files_to_assessment_item(question, data):
    """ Generate files that reference the content node's assessment items """
    for file_data in data:
        file_hash = file_data['filename'].split(".")
        kind_preset = FormatPreset.objects.get(id=file_data['preset'])

        file_path=generate_file_on_disk_name(file_hash[0], file_data['filename'])
        if not os.path.isfile(file_path):
            raise IOError('{} not found'.format(file_path))

        file_obj = File(
            checksum=file_hash[0],
            assessment_item=question,
            file_format_id=file_hash[1],
            original_filename=file_data.get('original_filename') or 'file',
            source_url=file_data.get('source_url'),
            file_size = file_data['size'],
            file_on_disk=DjFile(open(file_path, 'rb')),
            preset=kind_preset,
        )
        file_obj.save()

def create_exercises(node, data):
    """ Generate exercise from data """
    with transaction.atomic():
        order = 0

        for question in data:
            question_obj = AssessmentItem(
                type = question.get('type'),
                question = question.get('question'),
                hints = question.get('hints'),
                answers = question.get('answers'),
                order = order,
                contentnode = node,
                assessment_id = question.get('assessment_id'),
                raw_data = question.get('raw_data'),
                source_url=question.get('source_url'),
                randomize=question.get('randomize') or False,
            )
            order += 1
            question_obj.save()
            map_files_to_assessment_item(question_obj, question['files'])

