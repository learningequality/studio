from rest_framework import status
from django.http import Http404
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from contentcuration.models import *
from contentcuration.serializers import *
from rest_framework.renderers import JSONRenderer

def base(request):
    return render(request, 'base.html')

def testpage(request):
     return render(request, 'test.html')

def edit(request):
     # Add code to only return channel user has access to
     content_serializer = ContentSerializer(ContentNode.objects.all(), many=True)
     topic_serializer = TopicSerializer(TopicNode.objects.all(), many=True) 
     jsonrenderer = JSONRenderer()
     #topic_tree = TopicTreeSerializer(TopicTree.objects.all()[0]) #TODO: Change to match selected channel from dropdown
     return render(request, 'channel_edit.html', 
            {'topicnodes': jsonrenderer.render(topic_serializer.data), 
            'contentnodes': jsonrenderer.render(content_serializer.data)})