from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.utils import model_meta
from contentcuration.models import CaptionCue, CaptionFile
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

    def to_internal_value(self, data):
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
        ModelClass = cls.Meta.model
        info = model_meta.get_field_info(ModelClass)
        return getattr(cls.Meta, "update_lookup_field", info.pk.name)


class CaptionViewSet(ValuesViewset):
    # Handles operations for the CaptionFile model.
    queryset = CaptionFile.objects.prefetch_related("caption_cue")
    permission_classes = [IsAuthenticated]
    serializer_class = CaptionFileSerializer
    values = ("id", "file_id", "language", "caption_cue")

    field_map = {
        "file_id": "file_id",
        "language": "language",
        "caption_cue": "caption_cue",
    }

    def get_queryset(self):
        queryset = super().get_queryset()

        file_id = self.request.GET.get("file_id")
        language = self.request.GET.get("language")

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
        "text": "text",
        "start_time": "starttime",
        "end_time": "endtime",
        "caption_file_id": "caption_file_id",
    }

    def list(self, request, *args, **kwargs):
        caption_file_id = kwargs["caption_file_id"]
        queryset = CaptionCue.objects.filter(caption_file_id=caption_file_id)
        return Response(self.serialize(queryset))
