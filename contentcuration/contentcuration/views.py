from rest_framework import status
from django.http import Http404
from django.shortcuts import render, render_to_response
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


def exercise(request):

    exercise_list = Exercise.objects.all()

    paginator = Paginator(exercise_list, 25) # Show 25 exercises per page

    page = request.GET.get('page')

    try:
        exercises = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        exercises = paginator.page(1)
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        exercises = paginator.page(paginator.num_pages)

    return render_to_response('exercise_list.html', {"exercises": exercises})
