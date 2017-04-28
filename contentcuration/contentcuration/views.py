import copy
import json
import logging
import os
import re
import hashlib
import shutil
import time
import tempfile
import random
import uuid
from django.http import Http404, HttpResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect, render_to_response
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core import paginator, serializers
from django.core.cache import cache
from django.core.management import call_command
from django.core.exceptions import ObjectDoesNotExist
from django.core.context_processors import csrf
from django.db import transaction
from django.db.models import Q, Case, When, Value, IntegerField, Max
from django.core.urlresolvers import reverse_lazy
from django.core.files import File as DjFile
from rest_framework.renderers import JSONRenderer
from contentcuration.api import write_file_to_storage, check_supported_browsers
from contentcuration.utils.files import extract_thumbnail_wrapper, compress_video_wrapper,  generate_thumbnail_from_node, duplicate_file
from contentcuration.models import Exercise, AssessmentItem, Channel, License, FileFormat, File, FormatPreset, ContentKind, ContentNode, ContentTag, User, Invitation, generate_file_on_disk_name, generate_storage_url
from contentcuration.serializers import RootNodeSerializer, AssessmentItemSerializer, AccessibleChannelListSerializer, ChannelListSerializer, ChannelSerializer, LicenseSerializer, FileFormatSerializer, FormatPresetSerializer, ContentKindSerializer, ContentNodeSerializer, SimplifiedContentNodeSerializer, TagSerializer, UserSerializer, CurrentUserSerializer, UserChannelListSerializer, FileSerializer
from le_utils.constants import format_presets, content_kinds, file_formats, exercises, licenses
from rest_framework.authentication import SessionAuthentication, BasicAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from pressurecooker.videos import guess_video_preset_by_resolution, extract_thumbnail_from_video, compress_video
from pressurecooker.images import create_tiled_image
from pressurecooker.encodings import write_base64_to_file

def get_nodes_by_ids(request):
    if request.method == 'POST':
        nodes = ContentNode.objects.prefetch_related('files').prefetch_related('assessment_items')\
                .prefetch_related('tags').prefetch_related('children').filter(pk__in=json.loads(request.body))
        return HttpResponse(JSONRenderer().render(ContentNodeSerializer(nodes, many=True).data))

def get_nodes_by_ids_simplified(request):
    if request.method == 'POST':
        nodes = ContentNode.objects.prefetch_related('children').filter(pk__in=json.loads(request.body))
        return HttpResponse(JSONRenderer().render(SimplifiedContentNodeSerializer(nodes, many=True).data))

def base(request):
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))
    if request.user.is_authenticated():
        return redirect('channels')
    else:
        return redirect('accounts/login')

def health(request):
    return HttpResponse("500")

def unsupported_browser(request):
    return render(request, 'unsupported_browser.html')

def unauthorized(request):
    return render(request, 'unauthorized.html')

def get_or_set_cached_constants(constant, serializer):
    cached_data = cache.get(constant.__name__)
    if cached_data:
        return cached_data
    constant_objects = constant.objects.all()
    constant_serializer = serializer(constant_objects, many=True)
    constant_data = JSONRenderer().render(constant_serializer.data)
    cache.set(constant.__name__, constant_data, None)
    return constant_data

def channel_page(request, channel, allow_edit=False):
    channel_serializer =  ChannelSerializer(channel)

    channel_list = Channel.objects.select_related('main_tree').prefetch_related('editors').prefetch_related('viewers')\
                            .exclude(id=channel.pk).filter(Q(deleted=False) & (Q(editors=request.user) | Q(viewers=request.user)))\
                            .annotate(is_view_only=Case(When(editors=request.user, then=Value(0)),default=Value(1),output_field=IntegerField()))\
                            .distinct().values("id", "name", "is_view_only").order_by('name')

    fileformats = get_or_set_cached_constants(FileFormat, FileFormatSerializer)
    licenses = get_or_set_cached_constants(License, LicenseSerializer)
    formatpresets = get_or_set_cached_constants(FormatPreset, FormatPresetSerializer)
    contentkinds = get_or_set_cached_constants(ContentKind, ContentKindSerializer)

    json_renderer = JSONRenderer()

    return render(request, 'channel_edit.html', {"allow_edit":allow_edit,
                                                "channel" : json_renderer.render(channel_serializer.data),
                                                "channel_id" : channel.pk,
                                                "channel_name": channel.name,
                                                "channel_list" : channel_list,
                                                "fileformat_list" : fileformats,
                                                "license_list" : licenses,
                                                "fpreset_list" : formatpresets,
                                                "ckinds_list" : contentkinds,
                                                "current_user" : json_renderer.render(CurrentUserSerializer(request.user).data),
                                                "preferences" : request.user.preferences,
                                            })

@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def channel_list(request):
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))

    channel_list = Channel.objects.prefetch_related('editors').prefetch_related('viewers').filter(Q(deleted=False) & (Q(editors=request.user.pk) | Q(viewers=request.user.pk)))\
                    .annotate(is_view_only=Case(When(editors=request.user, then=Value(0)),default=Value(1),output_field=IntegerField()))

    channel_serializer = ChannelListSerializer(channel_list, many=True)

    return render(request, 'channel_list.html', {"channels" : JSONRenderer().render(channel_serializer.data),
                                                 "channel_name" : False,
                                                 "current_user" : JSONRenderer().render(UserChannelListSerializer(request.user).data)})

@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def channel(request, channel_id):
    # Check if browser is supported
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))

    channel = get_object_or_404(Channel, id=channel_id, deleted=False)

    # Check user has permission to view channel
    if not channel.editors.filter(id=request.user.id).exists() and not request.user.is_admin:
        return redirect(reverse_lazy('unauthorized'))

    return channel_page(request, channel, allow_edit=True)

@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def channel_view_only(request, channel_id):
    # Check if browser is supported
    if not check_supported_browsers(request.META.get('HTTP_USER_AGENT')):
        return redirect(reverse_lazy('unsupported_browser'))

    channel = get_object_or_404(Channel, id=channel_id, deleted=False)

    # Check user has permission to view channel
    if not channel.editors.filter(id=request.user.id).exists() and not channel.viewers.filter(id=request.user.id).exists() and not request.user.is_admin:
        return redirect(reverse_lazy('unauthorized'))

    return channel_page(request, channel)

def file_upload(request):
    if request.method == 'POST':
        preset = FormatPreset.objects.get(id=request.META.get('HTTP_PRESET'))
        #Implement logic for switching out files without saving it yet
        filename, ext = os.path.splitext(request.FILES.values()[0]._name)
        size = request.FILES.values()[0]._size
        file_object = File(file_size=size, file_on_disk=DjFile(request.FILES.values()[0]), file_format_id=ext[1:], original_filename=request.FILES.values()[0]._name, preset=preset)
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "filename": str(file_object),
            "file": JSONRenderer().render(FileSerializer(file_object).data)
        }))

def file_create(request):
    if request.method == 'POST':
        original_filename, ext = os.path.splitext(request.FILES.values()[0]._name)
        size = request.FILES.values()[0]._size
        presets = FormatPreset.objects.filter(allowed_formats__extension__contains=ext[1:])
        kind = presets.first().kind
        preferences = json.loads(request.user.preferences)
        author = preferences.get('author') if isinstance(preferences.get('author'), basestring) else request.user.get_full_name()
        license = License.objects.filter(license_name=preferences.get('license')).first() # Use filter/first in case preference hasn't been set
        license_id = license.pk if license else settings.DEFAULT_LICENSE
        new_node = ContentNode(title=original_filename, kind=kind, license_id=license_id, author=author, copyright_holder=preferences.get('copyright_holder'))
        if license.license_name == licenses.SPECIAL_PERMISSIONS:
            new_node.license_description = preferences.get('license_description')
        new_node.save()
        file_object = File(file_on_disk=DjFile(request.FILES.values()[0]), file_format_id=ext[1:], original_filename=request.FILES.values()[0]._name, contentnode=new_node, file_size=size)
        file_object.save()
        if kind.pk == content_kinds.VIDEO:
            file_object.preset_id = guess_video_preset_by_resolution(str(file_object.file_on_disk))
        elif presets.filter(supplementary=False).count() == 1:
            file_object.preset = presets.filter(supplementary=False).first()

        file_object.save()

        try:
            if preferences.get('auto_derive_video_thumbnail') and new_node.kind_id == content_kinds.VIDEO \
                or preferences.get('auto_derive_audio_thumbnail') and new_node.kind_id == content_kinds.AUDIO \
                or preferences.get('auto_derive_html5_thumbnail') and new_node.kind_id == content_kinds.HTML5 \
                or preferences.get('auto_derive_document_thumbnail') and new_node.kind_id == content_kinds.DOCUMENT:
                generate_thumbnail_from_node(new_node, set_node=True)
        except Exception:
            pass

        return HttpResponse(json.dumps({
            "success": True,
            "node": JSONRenderer().render(ContentNodeSerializer(new_node).data)
        }))

def generate_thumbnail(request):
    logging.debug("Entering the generate_thumbnail endpoint")

    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)
        node = ContentNode.objects.get(pk=data["node_id"])

        thumbnail_object = generate_thumbnail_from_node(node)

        return HttpResponse(json.dumps({
            "success": True,
            "file": JSONRenderer().render(FileSerializer(thumbnail_object).data),
            "path": generate_storage_url(str(thumbnail_object)),
        }))

def thumbnail_upload(request):
    if request.method == 'POST':
        fobj = request.FILES.values()[0]
        formatted_filename = write_file_to_storage(fobj)

        return HttpResponse(json.dumps({
            "success": True,
            "formatted_filename": formatted_filename,
            "file":  None,
            "path": generate_storage_url(formatted_filename),
        }))

def image_upload(request):
    if request.method == 'POST':
        name, ext = os.path.splitext(request.FILES.values()[0]._name) # gets file extension without leading period
        file_object = File(contentnode_id=request.META.get('HTTP_NODE'),original_filename=name, preset_id=request.META.get('HTTP_PRESET'), file_on_disk=DjFile(request.FILES.values()[0]), file_format_id=ext[1:])
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "file": JSONRenderer().render(FileSerializer(file_object).data),
            "path": generate_storage_url(str(file_object)),
        }))

def exercise_image_upload(request):
    if request.method == 'POST':
        ext = os.path.splitext(request.FILES.values()[0]._name)[1][1:] # gets file extension without leading period
        file_object = File(preset_id=format_presets.EXERCISE_IMAGE, file_on_disk=DjFile(request.FILES.values()[0]), file_format_id=ext)
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "formatted_filename": exercises.CONTENT_STORAGE_FORMAT.format(str(file_object)),
            "file_id": file_object.pk,
            "path": generate_storage_url(str(file_object)),
        }))

def duplicate_nodes(request):
    logging.debug("Entering the copy_node endpoint")

    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)

        try:
            nodes = data["nodes"]
            sort_order = data.get("sort_order") or 1
            target_parent = data["target_parent"]
            channel_id = data["channel_id"]
            new_nodes = []

            with transaction.atomic():
                with ContentNode.objects.disable_mptt_updates():
                    for node_data in nodes:
                        new_node = _duplicate_node_bulk(node_data['id'], sort_order=sort_order, parent=target_parent, channel_id=channel_id)
                        new_nodes.append(new_node.pk)
                        sort_order+=1

        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

        return HttpResponse(json.dumps({
            "success": True,
            "node_ids": " ".join(new_nodes)
        }))

def _duplicate_node_bulk(node, sort_order=None, parent=None, channel_id=None):
    if isinstance(node, int) or isinstance(node, basestring):
        node = ContentNode.objects.get(pk=node)

    # keep track of the in-memory models so that we can bulk-create them at the end (for efficiency)
    to_create = {
        "nodes": [],
        "node_files": [],
        "assessment_files": [],
        "assessments": [],
    }

    # perform the actual recursive node cloning
    new_node = _duplicate_node_bulk_recursive(node=node, sort_order=sort_order, parent=parent, channel_id=channel_id, to_create=to_create)

    # create nodes, one level at a time, starting from the top of the tree (so that we have IDs to pass as "parent" for next level down)
    for node_level in to_create["nodes"]:
        for node in node_level:
            node.parent_id = node.parent.id
        ContentNode.objects.bulk_create(node_level)
        for node in node_level:
            for tag in node._meta.tags_to_add:
                node.tags.add(tag)

    # rebuild MPTT tree for this channel (since we're inside "disable_mptt_updates", and bulk_create doesn't trigger rebuild signals anyway)
    ContentNode.objects.partial_rebuild(to_create["nodes"][0][0].tree_id)

    ai_node_ids = []

    # create each of the assessment items
    for a in to_create["assessments"]:
        a.contentnode_id = a.contentnode.id
        ai_node_ids.append(a.contentnode_id)
    AssessmentItem.objects.bulk_create(to_create["assessments"])

    # build up a mapping of contentnode/assessment_id onto assessment item IDs, so we can point files to them correctly after
    aid_mapping = {}
    for a in AssessmentItem.objects.filter(contentnode_id__in=ai_node_ids):
        aid_mapping[a.contentnode_id + ":" + a.assessment_id] = a.id

    # create the file objects, for both nodes and assessment items
    for f in to_create["node_files"]:
        f.contentnode_id = f.contentnode.id
    for f in to_create["assessment_files"]:
        f.assessment_item_id = aid_mapping[f.assessment_item.contentnode_id + ":" + f.assessment_item.assessment_id]
    File.objects.bulk_create(to_create["node_files"] + to_create["assessment_files"])

    return new_node

def _duplicate_node_bulk_recursive(node, sort_order, parent, channel_id, to_create, level=0):

    if isinstance(node, int) or isinstance(node, basestring):
        node = ContentNode.objects.get(pk=node)

    if isinstance(parent, int) or isinstance(parent, basestring):
        parent = ContentNode.objects.get(pk=parent)

    # clone the model (in-memory) and update the fields on the cloned model
    new_node = copy.copy(node)
    new_node.id = None
    new_node.tree_id = parent.tree_id
    new_node.parent = parent
    new_node.sort_order = sort_order or node.sort_order
    new_node.changed = True
    new_node.cloned_source = node
    new_node.source_channel_id = node.get_channel().id if node.get_channel() else None
    new_node.node_id = uuid.uuid4().hex
    new_node.source_node_id = node.node_id

    # There might be some legacy nodes that don't have these, so ensure they are added
    if not new_node.original_channel_id or not new_node.original_source_node_id:
        original_node = node.get_original_node()
        original_channel = original_node.get_channel()
        new_node.original_channel_id = original_channel.id if original_channel else None
        new_node.original_source_node_id = original_node.node_id

    # store the new unsaved model in a list, at the appropriate level, for later creation
    while len(to_create["nodes"]) <= level:
        to_create["nodes"].append([])
    to_create["nodes"][level].append(new_node)

    # find or create any tags that are needed, and store them under _meta on the node so we can add them to it later
    new_node._meta.tags_to_add = []
    for tag in node.tags.all():
        new_tag, is_new = ContentTag.objects.get_or_create(
            tag_name=tag.tag_name,
            channel_id=channel_id,
        )
        new_node._meta.tags_to_add.append(new_tag)

    # clone the file objects for later saving
    for fobj in node.files.all():
        f = duplicate_file(fobj, node=new_node, save=False)
        to_create["node_files"].append(f)

    # copy assessment item objects, and associated files
    for aiobj in node.assessment_items.prefetch_related("files").all():
        aiobj_copy = copy.copy(aiobj)
        aiobj_copy.id = None
        aiobj_copy.contentnode = new_node
        to_create["assessments"].append(aiobj_copy)
        for fobj in aiobj.files.all():
            f = duplicate_file(fobj, assessment_item=aiobj_copy, save=False)
            to_create["assessment_files"].append(f)

    # recurse down the tree and clone the children
    for child in node.children.all():
        _duplicate_node_bulk_recursive(node=child, sort_order=None, parent=new_node, channel_id=channel_id, to_create=to_create, level=level+1)

    return new_node

def move_nodes(request):
    logging.debug("Entering the move_nodes endpoint")

    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)

        try:
            nodes = data["nodes"]
            target_parent = ContentNode.objects.get(pk=data["target_parent"])
            channel_id = data["channel_id"]
            min_order = data.get("min_order") or 0
            max_order = data.get("max_order") or min_order + len(nodes)

        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

        all_ids = []
        with transaction.atomic():
            for n in nodes:
                min_order = min_order + float(max_order - min_order) / 2
                node = ContentNode.objects.get(pk=n['id'])
                _move_node(node, parent=target_parent, sort_order=min_order, channel_id=channel_id)
                all_ids.append(n['id'])

        serialized = ContentNodeSerializer(ContentNode.objects.filter(pk__in=all_ids), many=True).data
        return HttpResponse(JSONRenderer().render(serialized))

def _move_node(node, parent=None, sort_order=None, channel_id=None):
    node.parent = parent
    node.sort_order = sort_order
    node.changed = True
    descendants = node.get_descendants(include_self=True)
    node.save()

    for tag in ContentTag.objects.filter(tagged_content__in=descendants).distinct():
        # If moving from another channel
        if tag.channel_id != channel_id:
            t, is_new = ContentTag.objects.get_or_create(tag_name=tag.tag_name, channel_id=channel_id)

            # Set descendants with this tag to correct tag
            for n in descendants.filter(tags=tag):
                n.tags.remove(tag)
                n.tags.add(t)

    return node

@csrf_exempt
def publish_channel(request):
    logging.debug("Entering the publish_channel endpoint")
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
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

def accessible_channels(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        accessible_list = ContentNode.objects.filter(pk__in=Channel.objects.select_related('main_tree')\
                        .filter(Q(deleted=False) & (Q(public=True) | Q(editors=request.user) | Q(viewers=request.user)))\
                        .exclude(pk=data["channel_id"]).values_list('main_tree_id', flat=True))
        return HttpResponse(JSONRenderer().render(RootNodeSerializer(accessible_list, many=True).data))
