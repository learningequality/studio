import copy
import json
from rest_framework import status
from django.http import Http404, HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.core import paginator
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.storage import get_storage_class
from django.template import RequestContext
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from contentcuration.models import Exercise, AssessmentItem, Channel, Node, TopicTree, MimeType, ContentLicense
from contentcuration.serializers import ExerciseSerializer, AssessmentItemSerializer, ChannelSerializer, NodeSerializer, TopicTreeSerializer, MimeTypeSerializer, LicenseSerializer

from kolibri.content.models import File

def base(request):
    return redirect('channels')    # redirect to the channel list page


def testpage(request):
    return render(request, 'test.html')

def channel_list(request):
    channel_list = Channel.objects.all() # Todo: only allow access to certain channels?
    channel_serializer = ChannelSerializer(channel_list, many=True)

    licenses = ContentLicense.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)
    return render(request, 'channel_list.html', {"channels" : JSONRenderer().render(channel_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data)})

def channel(request, channel_id):
    channel = get_object_or_404(Channel, id=channel_id)
    channel_serializer =  ChannelSerializer(channel)

    mimetypes = MimeType.objects.all()
    mimetype_serializer = MimeTypeSerializer(mimetypes, many=True)

    mimetypes = MimeType.objects.all()
    mimetype_serializer = MimeTypeSerializer(mimetypes, many=True)

    licenses = ContentLicense.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)
    return render(request, 'channel_edit.html', {"channel" : JSONRenderer().render(channel_serializer.data),
                                                 "mimetypes" : JSONRenderer().render(mimetype_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data)})

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
        file_object = File(content_copy=request.FILES.values()[0])
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "filename": str(file_object),
        }))


@csrf_exempt
def copy_node(request):
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)

        try:
            node_id = data["node_id"]
        except KeyError:
            raise ObjectDoesNotExist("Node id %s not in POST data.".format(node_id))

        new_node = _copy_node(node_id, root=True)

        return HttpResponse(json.dumps({"node_id": new_node.id}))


def _copy_node(node, root=False):
    if isinstance(node, int):
        node = Node.objects.get(pk=node)

    node = copy.copy(node)
    node.id = node.pk = None
    node.parent = None if root else node.parent
    node.published = False

    node.children = [_copy_node(c, root=False) for c in node.children.all()]
    node.save()

    return node
