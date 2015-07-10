from rest_framework import status
from django.http import Http404
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from contentcuration.models import *
from contentcuration.serializers import *

def base(request):
    return render(request, 'base.html')

def testpage(request):
     return render(request, 'test.html')

def edit(request):
     return render(request, 'edit_page.html')

def preview(request):
     return render(request, 'preview_page.html')

def trash(request):
     return render(request, 'trash_page.html')
