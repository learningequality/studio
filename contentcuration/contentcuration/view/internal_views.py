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

# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
def file_diff(request):
    logging.debug("Entering the file_diff endpoint")
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)
        in_db_list = File.objects.annotate(filename=Concat('checksum', Value('.'),  'file_format')).filter(filename__in=data).values_list('filename', flat=True)
    	to_return = list(set(data) - set(in_db_list))
        return HttpResponse(json.dumps(to_return))

# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
def api_file_upload(request):
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        try:
            fobj = request.FILES["file"]
            file_path = generate_file_on_disk_name(fobj._name.split(".")[-2], fobj._name)

            with open(file_path, 'wb') as destf:
                shutil.copyfileobj(fobj, destf)

            return HttpResponse(json.dumps({
                "success": True,
            }))
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data")

# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
def api_create_channel_endpoint(request):
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)
        try:
            content_data = data['content_data']
            channel_data = data['channel_data']
            file_data = data['file_data']

            obj = api_create_channel(channel_data, content_data, file_data)
            invitation = Invitation.objects.create(channel=obj)

            return HttpResponse(json.dumps({
                "success": True,
                "new_channel": obj.pk,
                "invite_id":invitation.pk,
            }))
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

@login_required
def api_open_channel(request, invitation_id, channel_id):
    if Invitation.objects.filter(id=invitation_id, channel_id=channel_id).exists():
        channel = Channel.objects.get(id=channel_id)
        if not channel.editors.filter(id = request.user.pk).exists():
            channel.editors.add(request.user)
        channel.save()
        Invitation.objects.get(id=invitation_id).delete()
        return redirect('/channels/{0}/edit'.format(channel_id))
    else:
        return redirect('/open_fail')

def fail_open_channel(request):
    return render(request, 'permissions/open_channel_fail.html')



""" CHANNEL CREATE FUNCTIONS """
def api_create_channel(channel_data, content_data, file_data):
    channel = create_channel(channel_data) # Set up initial channel
    root_node = init_staging_tree(channel) # Set up initial staging tree
    with transaction.atomic():
        convert_data_to_nodes(content_data, root_node, file_data) # converts dict to django models
        update_channel(channel, root_node)
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

def convert_data_to_nodes(content_data, parent_node, file_data):
    sort_order = 1
    for node_data in content_data:
        new_node = create_node(node_data, parent_node, sort_order)
        map_files_to_node(new_node, node_data['files'], file_data)
        create_exercises(new_node, node_data['questions'])
        convert_data_to_nodes(node_data['children'], new_node, file_data)
        sort_order += 1

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
        parent = parent_node,
        extra_fields=extra_fields,
        sort_order = sort_order,
    )

def map_files_to_node(node, data, file_data):

    for f in data:
        file_hash = f.split(".")
        kind_preset = None
        if file_data[f]['preset'] is None:
            kind_preset = FormatPreset.objects.filter(kind=node.kind, allowed_formats__extension__contains=file_hash[1], display=True).first()
        else:
            kind_preset = FormatPreset.objects.get(id=file_data[f]['preset'])

        file_obj = File(
            checksum=file_hash[0],
            contentnode=node,
            file_format_id=file_hash[1],
            original_filename=file_data[f]['original_filename'],
            source_url=file_data[f]['source_url'],
            file_size = file_data[f]['size'],
            file_on_disk=DjFile(open(generate_file_on_disk_name(file_hash[0], f), 'rb')),
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

def update_channel(channel, root):
    channel.main_tree = root
    channel.version += 1
    channel.save()
