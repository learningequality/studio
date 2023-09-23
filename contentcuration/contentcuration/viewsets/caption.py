<<<<<<< HEAD
import logging

from le_utils.constants.format_presets import AUDIO, VIDEO_HIGH_RES, VIDEO_LOW_RES
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import CaptionCue, CaptionFile, Change, File
from contentcuration.tasks import generatecaptioncues_task
from contentcuration.viewsets.base import BulkModelSerializer, ValuesViewset
from contentcuration.viewsets.sync.constants import CAPTION_FILE
from contentcuration.viewsets.sync.utils import generate_update_event


class CaptionCueSerializer(BulkModelSerializer):
=======
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status 

from contentcuration.models import CaptionCue, CaptionFile
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.sync.utils import log_sync_exception


class CaptionCueSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        """Check that the start is before the stop."""
        super().validate(attrs)
        if attrs["starttime"] > attrs["endtime"]:
            raise serializers.ValidationError("The cue must finish after start.")
        return attrs

>>>>>>> 9c697776d (Adds caption editor components, updated IndexedDB Resource)
    class Meta:
        model = CaptionCue
        fields = ["text", "starttime", "endtime", "caption_file_id"]

<<<<<<< HEAD
    def validate(self, attrs):
        """Check that the cue's starttime is before the endtime."""
        attrs = super().validate(attrs)
        if attrs["starttime"] > attrs["endtime"]:
            raise serializers.ValidationError("The cue must finish after start.")
        return attrs

    def to_internal_value(self, data):
        """
        Copies the caption_file_id from the request data
        to the internal representation before validation.

        Without this, the caption_file_id would be lost
        if validation fails, leading to errors.
        """
        caption_file_id = data.get("caption_file_id")
        value = super().to_internal_value(data)

        if "caption_file_id" not in value:
            value["caption_file_id"] = caption_file_id
        return value



class CaptionFileSerializer(BulkModelSerializer):
=======

class CaptionFileSerializer(serializers.ModelSerializer):
>>>>>>> 9c697776d (Adds caption editor components, updated IndexedDB Resource)
    caption_cue = CaptionCueSerializer(many=True, required=False)

    class Meta:
        model = CaptionFile
        fields = ["id", "file_id", "language", "caption_cue"]

    def to_representation(self, instance):
        # we need to change this?
        return super().to_representation(instance)


class CaptionViewSet(ValuesViewset):
    # Handles operations for the CaptionFile model.
    queryset = CaptionFile.objects.prefetch_related("caption_cue")
    permission_classes = [IsAuthenticated]
    serializer_class = CaptionFileSerializer
    values = ("id", "file_id", "language")

    field_map = {
<<<<<<< HEAD
        "file_id": "file_id",
        "language": "language",
=======
        "file": "file_id",
        "language": "language",
        "caption_cue": "caption_cue",
>>>>>>> 9c697776d (Adds caption editor components, updated IndexedDB Resource)
    }

    def get_queryset(self):
        queryset = super().get_queryset()
<<<<<<< HEAD
=======

        file_id = self.request.GET.get("file_id")
        language = self.request.GET.get("language")

        if file_id:
            queryset = queryset.filter(file_id=file_id)
        if language:
            queryset = queryset.filter(language=language)

        return queryset

    def delete_from_changes(self, changes):
        errors = []
        queryset = self.get_edit_queryset().order_by()
        for change in changes:
            try:
                instance = queryset.filter(**dict(self.values_from_key(change["key"])))
>>>>>>> 9c697776d (Adds caption editor components, updated IndexedDB Resource)

        contentnode_ids = self.request.GET.get("contentnode__in")
        file_id = self.request.GET.get("file_id")
        language = self.request.GET.get("language")

        if contentnode_ids:
            contentnode_ids = contentnode_ids.split(",")
            file_ids = File.objects.filter(
                preset_id__in=[AUDIO, VIDEO_HIGH_RES, VIDEO_LOW_RES],
                contentnode_id__in=contentnode_ids,
            ).values_list("pk", flat=True)
            queryset = queryset.filter(file_id__in=file_ids)

        if file_id:
            queryset = queryset.filter(file_id=file_id)
        if language:
            queryset = queryset.filter(language=language)

        return queryset

    def perform_create(self, serializer, change=None):
        instance = serializer.save()
        Change.create_change(
            generate_update_event(
                instance.pk,
                CAPTION_FILE,
                { "__generating_captions": True, },
                channel_id=change['channel_id']
            ), applied=True, created_by_id=self.request.user.id
        )

        # enqueue task of generating captions for the saved CaptionFile instance
        try:
            # Also sets the generating flag to false <<< Generating Completed
            generatecaptioncues_task.enqueue(
                self.request.user,
                caption_file_id=instance.pk,
                channel_id=change['channel_id'],
                user_id=self.request.user.id,
            )

        except Exception as e:
            logging.error(f"Failed to queue celery task.\nWith the error: {e}")


class CaptionCueViewSet(ValuesViewset):
    # Handles operations for the CaptionCue model.
    queryset = CaptionCue.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = CaptionCueSerializer
<<<<<<< HEAD
    values = ("id", "text", "starttime", "endtime", "caption_file_id")
=======
    values = ("text", "starttime", "endtime", "caption_file")
>>>>>>> 9c697776d (Adds caption editor components, updated IndexedDB Resource)

    field_map = {
        "id": "id",
        "text": "text",
<<<<<<< HEAD
        "starttime": "starttime",
        "endtime": "endtime",
        "caption_file": "caption_file_id",
    }

    def list(self, request, *args, **kwargs):
        caption_file_id = kwargs["caption_file_id"]
=======
        "start_time": "starttime",
        "end_time": "endtime",
        "caption_file_id": "caption_file",
    }

    def list(self, request, *args, **kwargs):
        caption_file_id = kwargs['caption_file_id']
>>>>>>> 9c697776d (Adds caption editor components, updated IndexedDB Resource)
        queryset = CaptionCue.objects.filter(caption_file_id=caption_file_id)
        return Response(self.serialize(queryset))
