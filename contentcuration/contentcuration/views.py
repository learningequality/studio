import json
from rest_framework import status
from django.http import Http404, HttpResponse
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.core import paginator
from django.core.files.storage import get_storage_class
from django.template import RequestContext
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from contentcuration.models import Exercise, AssessmentItem, Channel, Node, TopicTree, MimeType, ContentLicense
from contentcuration.serializers import ExerciseSerializer, AssessmentItemSerializer, ChannelSerializer, NodeSerializer, TopicTreeSerializer, MimeTypeSerializer, LicenseSerializer

from kolibri.content.models import File

def base(request):
    return render(request, 'base.html')


def testpage(request):
    return render(request, 'test.html')

@login_required
def channel_list(request):
    channel_list = Channel.objects.all() # Todo: only allow access to certain channels?
    channel_serializer = ChannelSerializer(channel_list, many=True)

    licenses = ContentLicense.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)
    return render(request, 'channel_list.html', {"channels" : JSONRenderer().render(channel_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data)})

@login_required
def channel(request, channel_id):
    channel = get_object_or_404(Channel, id=channel_id)
    channel_serializer =  ChannelSerializer(channel)

<<<<<<< HEAD
    topictrees = TopicTree.objects.filter(channel = channel)
    topictree_serializer = TopicTreeSerializer(topictrees, many=True)

    mimetypes = MimeType.objects.all()
    mimetype_serializer = MimeTypeSerializer(mimetypes, many=True)

    licenses = ContentLicense.objects.all()
    license_serializer = LicenseSerializer(licenses, many=True)
    return render(request, 'channel_edit.html', {"channel" : JSONRenderer().render(channel_serializer.data),
                                                 "topictrees" : JSONRenderer().render(topictree_serializer.data),
                                                 "mimetypes" : JSONRenderer().render(mimetype_serializer.data),
                                                 "license_list" : JSONRenderer().render(license_serializer.data)})
=======
    return render(request, 'channel_edit.html', {"channel" : JSONRenderer().render(channel_serializer.data)})
>>>>>>> 3f016463678668c047c96803884f94ba7614f270

@login_required
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


@login_required
def exercise(request, exercise_id):

    exercise = get_object_or_404(Exercise, id=exercise_id)

    serializer = ExerciseSerializer(exercise)

    assessment_items = AssessmentItem.objects.filter(exercise=exercise)

    assessment_serialize = AssessmentItemSerializer(assessment_items, many=True)

    return render(request, 'exercise_edit.html', {"exercise": JSONRenderer().render(serializer.data), "assessment_items": JSONRenderer().render(assessment_serialize.data)})


@login_required
def file_upload(request):
    
    if request.method == 'POST':
        file_object = File(content_copy=request.FILES.values()[0])
        file_object.save()
        return HttpResponse(json.dumps({
            "success": True,
            "filename": str(file_object),
        }))

def data(request):
    return HttpResponse(json.dumps({
            "success": True,
            "filename": "blah blah blah",
        }))