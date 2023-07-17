from le_utils.constants.format_presets import (
    AUDIO,
    VIDEO_HIGH_RES,
    VIDEO_LOW_RES,
)
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.utils import model_meta

from contentcuration.models import CaptionCue, CaptionFile, File
from contentcuration.viewsets.base import ValuesViewset



class CaptionCueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaptionCue
        fields = ["text", "starttime", "endtime", "caption_file_id"]

    def validate(self, attrs):
        """Check that the cue's starttime is before the endtime."""
        attrs = super().validate(attrs)
        if attrs["starttime"] > attrs["endtime"]:
            raise serializers.ValidationError("The cue must finish after start.")
        return attrs

    class Meta:
        model = CaptionCue
        fields = ["text", "starttime", "endtime", "caption_file_id"]

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



class CaptionFileSerializer(serializers.ModelSerializer):
    caption_cue = CaptionCueSerializer(many=True, required=False)

    class Meta:
        model = CaptionFile
        fields = ["file_id", "language", "caption_cue"]

    @classmethod
    def id_attr(cls):
        """
        Returns the primary key name for the model class.

        Checks Meta.update_lookup_field to allow customizable 
        primary key names. Falls back to using the default "id".
        """
        ModelClass = cls.Meta.model
        info = model_meta.get_field_info(ModelClass)
        return getattr(cls.Meta, "update_lookup_field", info.pk.name)


class CaptionViewSet(ValuesViewset):
    # Handles operations for the CaptionFile model.
    queryset = CaptionFile.objects.prefetch_related("caption_cue")
    permission_classes = [IsAuthenticated]
    serializer_class = CaptionFileSerializer
    values = ("id", "file_id", "language")

    field_map = {
        "file_id": "file_id",
        "language": "language",
    }

    def get_queryset(self):
        queryset = super().get_queryset()

        contentnode_ids = self.request.GET.get("contentnode_id")
        file_id = self.request.GET.get("file_id")
        language = self.request.GET.get("language")

        if contentnode_ids:
            contentnode_ids = contentnode_ids.split(',')
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


class CaptionCueViewSet(ValuesViewset):
    # Handles operations for the CaptionCue model.
    queryset = CaptionCue.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = CaptionCueSerializer
    values = ("id", "text", "starttime", "endtime", "caption_file_id")

    field_map = {
        "id": "id",
        "text": "text",
        "starttime": "starttime",
        "endtime": "endtime",
        "caption_file": "caption_file_id",
    }

    def list(self, request, *args, **kwargs):
        caption_file_id = kwargs["caption_file_id"]
        queryset = CaptionCue.objects.filter(caption_file_id=caption_file_id)
        return Response(self.serialize(queryset))
