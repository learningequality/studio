import json
import logging
import os
import re
import shutil
from django.http import Http404, HttpResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect, render_to_response
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.core.context_processors import csrf
from django.db.models import Q
from django.template.loader import render_to_string
from contentcuration.models import Exercise, AssessmentItem, Channel, License, FileFormat, File, FormatPreset, ContentKind, ContentNode, ContentTag, Invitation, generate_file_on_disk_name
from le_utils.constants import content_kinds
from django.db.models.functions import Concat
from django.core.files import File as DjFile
from django.db.models import Q, Value
from django.db import transaction
from rest_framework.authentication import SessionAuthentication, BasicAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, authentication_classes, permission_classes

# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
@api_view(['POST'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def authenticate_user_internal(request):
    logging.debug("Logging in user")
    return HttpResponse(json.dumps({'success': True, 'token': unicode(request.auth), 'username':unicode(request.user)}))

# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
@api_view(['POST'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def file_diff(request):
    logging.debug("Entering the file_diff endpoint")
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)
        in_db_list = File.objects.annotate(filename=Concat('checksum', Value('.'),  'file_format')).filter(filename__in=data).values_list('filename', flat=True)
        to_return = []
        for f in list(set(data) - set(in_db_list)):
            file_path = generate_file_on_disk_name(f.split(".")[-2],f)
            # Write file if it doesn't already exist
            if not os.path.isfile(file_path):
                to_return += [f]
        return HttpResponse(json.dumps(to_return))

# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
@api_view(['POST'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def api_file_upload(request):
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        try:
            fobj = request.FILES["file"]
            file_path = generate_file_on_disk_name(fobj._name.split(".")[-2], fobj._name)

            # Write file if it doesn't already exist
            if not os.path.isfile(file_path):
                with open(file_path, 'wb') as destf:
                    shutil.copyfileobj(fobj, destf)

            return HttpResponse(json.dumps({
                "success": True,
            }))
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data")

# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
@api_view(['POST'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def api_create_channel_endpoint(request):
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)
        try:
            channel_data = data['channel_data']

            obj = api_create_channel(channel_data)

            return HttpResponse(json.dumps({
                "success": True,
                "root": obj.staging_tree.pk,
                "channel_id": obj.pk,
            }))
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

@csrf_exempt
@api_view(['POST'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def api_finish_channel(request):
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)
        try:
            channel_id = data['channel_id']

            obj = Channel.objects.get(pk=channel_id)
            obj.main_tree = obj.staging_tree
            obj.editors.add(request.user)
            obj.save()

            return HttpResponse(json.dumps({
                "success": True,
                "new_channel": obj.pk,
            }))
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

@csrf_exempt
@api_view(['POST'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def api_add_nodes_to_tree(request):
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
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


""" CHANNEL CREATE FUNCTIONS """
def api_create_channel(channel_data):
    channel = create_channel(channel_data) # Set up initial channel
    root_node = init_staging_tree(channel) # Set up initial staging tree
    return channel # Return new channel

def create_channel(channel_data):
    channel, isNew = Channel.objects.get_or_create(id=channel_data['id'])
    channel.name = channel_data['name']
    channel.description=channel_data['description']
    channel.thumbnail=channel_data['thumbnail']
    channel.deleted = False
    channel.save()
    return channel

def init_staging_tree(channel):
    channel.staging_tree = ContentNode.objects.create(title=channel.name + " staging", kind_id="topic", sort_order=0)
    channel.staging_tree.published = channel.version > 0
    channel.staging_tree.save()
    channel.save()
    return channel.staging_tree

def convert_data_to_nodes(content_data, parent_node):
    try:
        root_mapping = {}
        sort_order = 1
        with transaction.atomic():
            for node_data in content_data:
                new_node = create_node(node_data, parent_node, sort_order)
                map_files_to_node(new_node, node_data['files'])
                create_exercises(new_node, node_data['questions'])
                sort_order += 1
                root_mapping.update({node_data['node_id'] : new_node.pk})
            return root_mapping
    except KeyError as e:
        raise ObjectDoesNotExist("Error creating node: {0}".format(e.message))

def create_node(node_data, parent_node, sort_order):
    title=node_data['title']
    node_id=node_data['node_id']
    description=node_data['description']
    author = node_data['author']
    kind = ContentKind.objects.get(kind=node_data['kind'])
    extra_fields = node_data['extra_fields']
    license = None
    license_name = node_data['license']
    if license_name is not None:
        try:
            license = License.objects.get(license_name__iexact=license_name)
        except ObjectDoesNotExist:
            raise ObjectDoesNotExist("Invalid license found")

    return ContentNode.objects.create(
        title=title,
        kind=kind,
        node_id=node_id,
        description = description,
        author=author,
        license=license,
        parent_id = parent_node,
        extra_fields=extra_fields,
        sort_order = sort_order,
    )

def map_files_to_node(node, data):
    for file_data in data:
        file_hash = file_data['filename'].split(".")
        kind_preset = None
        if file_data['preset'] is None:
            kind_preset = FormatPreset.objects.filter(kind=node.kind, allowed_formats__extension__contains=file_hash[1], display=True).first()
        else:
            kind_preset = FormatPreset.objects.get(id=file_data['preset'])

        file_obj = File(
            checksum=file_hash[0],
            contentnode=node,
            file_format_id=file_hash[1],
            original_filename=file_data.get('original_filename') or 'file',
            source_url=file_data.get('source_url'),
            file_size = file_data['size'],
            file_on_disk=DjFile(open(generate_file_on_disk_name(file_hash[0], file_data['filename']), 'rb')),
            preset=kind_preset,
        )
        file_obj.save()


def map_files_to_assessment_item(question, data):
    for file_data in data:
        file_hash = file_data['filename'].split(".")
        kind_preset = FormatPreset.objects.get(id=file_data['preset'])

        file_obj = File(
            checksum=file_hash[0],
            assessment_item=question,
            file_format_id=file_hash[1],
            original_filename=file_data.get('original_filename') or 'file',
            source_url=file_data.get('source_url'),
            file_size = file_data['size'],
            file_on_disk=DjFile(open(generate_file_on_disk_name(file_hash[0], file_data['filename']), 'rb')),
            preset=kind_preset,
        )
        file_obj.save()

def create_exercises(node, data):
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
            )
            order += 1
            question_obj.save()
            map_files_to_assessment_item(question_obj, question['files'])
