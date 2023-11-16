from automation.views import TranscriptionsViewSet
from django.urls import include, path
from rest_framework import routers

automation_router = routers.DefaultRouter()
automation_router.register(r'transcribe', TranscriptionsViewSet, basename="transcribe")

urlpatterns = [
    path("api/automation/", include(automation_router.urls), name='automation'),
]
