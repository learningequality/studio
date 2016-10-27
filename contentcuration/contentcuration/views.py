import copy
import json
import logging
import os
import re
from django.http import Http404, HttpResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect, render_to_response
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core import paginator
from django.core.management import call_command
from django.core.exceptions import ObjectDoesNotExist
from django.core.context_processors import csrf
from django.db.models import Q
from rest_framework.renderers import JSONRenderer
from contentcuration.models import Exercise, AssessmentItem, Channel, License, FileFormat, File, FormatPreset, ContentKind, ContentNode, ContentTag, User, Invitation, generate_file_on_disk_name
from contentcuration.serializers import ExerciseSerializer, AssessmentItemSerializer, ChannelSerializer, LicenseSerializer, FileFormatSerializer, FormatPresetSerializer, ContentKindSerializer, ContentNodeSerializer, TagSerializer, UserSerializer

def base(request):
    if request.user.is_authenticated():
        return redirect('channels')
    else:
        return redirect('accounts/login')

def testpage(request):
    return render(request, 'test.html')

@login_required
def channel_list(request):
    channel_list = Channel.objects.filter(deleted=False, editors__email__contains= request.user)
    channel_serializer = ChannelSerializer(channel_list, many=True)

    licenses = License.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)
    return render(request, 'channel_list.html', {"channels" : JSONRenderer().render(channel_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data),
                                                 "current_user" : JSONRenderer().render(UserSerializer(request.user).data)})



@login_required
def channel(request, channel_id):
    channel = get_object_or_404(Channel, id=channel_id, deleted=False)
    channel_serializer =  ChannelSerializer(channel)

    channel_list = Channel.objects.filter(deleted=False, editors__email__contains= request.user)
    accessible_channel_list = Channel.objects.filter( Q(deleted=False, public=True) | Q(deleted=False, editors__email__contains= request.user))
    accessible_channel_list_serializer = ChannelSerializer(accessible_channel_list, many=True)

    fileformats = FileFormat.objects.all()
    fileformat_serializer = FileFormatSerializer(fileformats, many=True)

    licenses = License.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)

    formatpresets = FormatPreset.objects.all()
    formatpreset_serializer = FormatPresetSerializer(formatpresets, many=True)

    contentkinds = ContentKind.objects.all()
    contentkind_serializer = ContentKindSerializer(contentkinds, many=True)

    channel_tags = ContentTag.objects.filter(channel = channel)
    channel_tags_serializer = TagSerializer(channel_tags, many=True)

    return render(request, 'channel_edit.html', {"channel" : JSONRenderer().render(channel_serializer.data),
                                                "channel_id" : channel_id,
                                                "accessible_channels" : JSONRenderer().render(accessible_channel_list_serializer.data),
                                                "channels" : channel_list,
                                                "fileformat_list" : JSONRenderer().render(fileformat_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data),
                                                 "fpreset_list" : JSONRenderer().render(formatpreset_serializer.data),
                                                 "ckinds_list" : JSONRenderer().render(contentkind_serializer.data),
                                                 "ctags": JSONRenderer().render(channel_tags_serializer.data),
                                                 "current_user" : JSONRenderer().render(UserSerializer(request.user).data)})

def exercise_list(request):

    exercise_list = Exercise.objects.all().order_by('title')

    paged_list = paginator.Paginator(exercise_list, 25)  # Show 25 exercises per page

    page = request.GET.get('page')

    try:
        exercises = paged_list.page(page)
    except paginator.PageNotAnInteger:
        # If page is not an integer, deliver first page.
        exercises = paged_list.page(1)
    except paginator.EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        exercises = paged_list.page(paginator.num_pages)

    serializer = ExerciseSerializer(exercises.object_list, many=True)

    return render(request, 'exercise_list.html', {"exercises": exercises, "blob": JSONRenderer().render(serializer.data)})


def exercise(request, exercise_id):

    exercise = get_object_or_404(Exercise, id=exercise_id)

    serializer = ExerciseSerializer(exercise)

    assessment_items = AssessmentItem.objects.filter(exercise=exercise)

    assessment_serialize = AssessmentItemSerializer(assessment_items, many=True)

    return render(request, 'exercise_edit.html', {"exercise": JSONRenderer().render(serializer.data), "assessment_items": JSONRenderer().render(assessment_serialize.data)})

# TODO-BLOCKER: remove this csrf_exempt! People might upload random stuff here and we don't want that.
@csrf_exempt
def file_upload(request):
    if request.method == 'POST':
        preset = FormatPreset.objects.get(id=request.META.get('HTTP_PRESET'))
        #Implement logic for switching out files without saving it yet
        ext = os.path.splitext(request.FILES.values()[0]._name)[1].split(".")[-1]
        original_filename = request.FILES.values()[0]._name
        size = request.FILES.values()[0]._size
        file_object = File(file_size=size, file_on_disk=request.FILES.values()[0], file_format=FileFormat.objects.get(extension=ext), original_filename = original_filename, preset=preset)
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "filename": str(file_object),
            "object_id": file_object.pk
        }))

def file_create(request):
    if request.method == 'POST':
        ext = os.path.splitext(request.FILES.values()[0]._name)[1].split(".")[-1]
        size = request.FILES.values()[0]._size
        kind = FormatPreset.objects.filter(allowed_formats__extension__contains=ext).first().kind
        original_filename = request.FILES.values()[0]._name
        new_node = ContentNode(title=original_filename.split(".")[0], kind=kind, license_id=settings.DEFAULT_LICENSE, author=request.user.get_full_name())
        new_node.save()
        file_object = File(file_on_disk=request.FILES.values()[0], file_format=FileFormat.objects.get(extension=ext), original_filename = original_filename, contentnode=new_node, file_size=size)
        file_object.save()

        return HttpResponse(json.dumps({
            "success": True,
            "object_id": new_node.pk
        }))

@csrf_exempt
def thumbnail_upload(request):
    if request.method == 'POST':
        filename = request.FILES.values()[0]._name
        return HttpResponse(json.dumps({
            "success": True,
            "filename": filename
        }))

def exercise_image_upload(request):

    if request.method == 'POST':
        node = ContentNode.objects.get(id=request.META.get('HTTP_NODE'))
        ext = os.path.splitext(request.FILES.values()[0]._name)[1].split(".")[-1] # gets file extension without leading period
        file_object = File(file_on_disk=request.FILES.values()[0], file_format=FileFormat.objects.get(extension=ext), contentnode=node)
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "filename": file_object.file_on_disk.url,
        }))

def duplicate_nodes(request):
    logging.debug("Entering the copy_node endpoint")

    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)

        try:
            node_ids = data["node_ids"]
            sort_order = data["sort_order"]
            target_parent = data["target_parent"]
        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

        logging.info("Copying node id %s", node_ids)

        nodes = node_ids.split()
        new_nodes = []

        for node_id in nodes:
            new_node = _duplicate_node(node_id, sort_order=sort_order, parent=target_parent)
            new_nodes.append(new_node.pk)
            sort_order+=1

        return HttpResponse(json.dumps({
            "success": True,
            "node_ids": " ".join(new_nodes)
        }))

def _duplicate_node(node, sort_order=1, parent=None):
    if isinstance(node, int) or isinstance(node, basestring):
        node = ContentNode.objects.get(pk=node)
    new_node = ContentNode.objects.create(
        title=node.title,
        description=node.description,
        kind=node.kind,
        license=node.license,
        parent=ContentNode.objects.get(pk=parent) if parent else None,
        sort_order=sort_order,
        copyright_holder=node.copyright_holder,
        changed=True,
        original_node=node.original_node or node,
        cloned_source=node,
        author=node.author,
        content_id=node.content_id,
        extra_fields=node.extra_fields,
    )

    # add tags now
    new_node.tags.add(*node.tags.all())

    # copy file object too
    for fobj in node.files.all():
        fobj_copy = copy.copy(fobj)
        fobj_copy.id = None
        fobj_copy.contentnode = new_node
        fobj_copy.save()

    # copy assessment item object too
    for aiobj in node.assessment_items.all():
        aiobj_copy = copy.copy(aiobj)
        aiobj_copy.id = None
        aiobj_copy.contentnode = new_node
        aiobj_copy.save()

    for c in node.children.all():
        _duplicate_node(c, parent=new_node.id)

    return new_node

@csrf_exempt
def publish_channel(request):
    logging.debug("Entering the publish_channel endpoint")
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
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


