from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from contentcuration.models import *
from contentcuration.serializers import *
from rest_framework.renderers import JSONRenderer
from django.conf.urls import patterns, url, include


urlpatterns = patterns( #__package__ + '.api_views',
   # url(r'logs/$',      'learner_logs', {}, 'learner_logs'),
    #url(r'summary/$',      'aggregate_learner_logs', {}, 'aggregate_learner_logs'),

)