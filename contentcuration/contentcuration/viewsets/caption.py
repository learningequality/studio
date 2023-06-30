from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from contentcuration.models import CaptionCue, CaptionFile
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.sync.utils import log_sync_exception

class CaptionCueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaptionCue
        fields = ["text", "starttime", "endtime"]

class CaptionFileSerializer(serializers.ModelSerializer):
    caption_cue = CaptionCueSerializer(many=True, required=False)

    class Meta:
        model = CaptionFile
        fields = ["file_id", "language", "caption_cue"]


class CaptionViewSet(ValuesViewset):
    # Handles operations for the CaptionFile model.
    queryset = CaptionFile.objects.prefetch_related("caption_cue")
    permission_classes = [IsAuthenticated]
    serializer_class = CaptionFileSerializer
    values = ("file_id", "language", "caption_cue")

    field_map = {
        "file": "file_id", 
        "language": "language"
    }

    def delete_from_changes(self, changes):
        errors = []
        queryset = self.get_edit_queryset().order_by()
        for change in changes:
            try:
                instance = queryset.filter(**dict(self.values_from_key(change["key"])))

                self.perform_destroy(instance)
            except ObjectDoesNotExist:
                # If the object already doesn't exist, as far as the user is concerned
                # job done!
                pass
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=change)
                change["errors"] = [str(e)]
                errors.append(change)
        return errors


class CaptionCueViewSet(ValuesViewset):
    # Handles operations for the CaptionCue model.
    queryset = CaptionCue.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = CaptionCueSerializer
    values = ("text", "starttime", "endtime")

    field_map = {
        "text": "text",
        "start_time": "starttime",
        "end_time": "endtime",
    }
    # Add caption file in field_map?
