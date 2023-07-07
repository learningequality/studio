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

    class Meta:
        model = CaptionCue
        fields = ["text", "starttime", "endtime"]


class CaptionFileSerializer(serializers.ModelSerializer):
    caption_cue = CaptionCueSerializer(many=True, required=False)

    class Meta:
        model = CaptionFile
        fields = ["file_id", "language", "caption_cue"]

    def to_representation(self, instance):
        # we need to change this?
        return super().to_representation(instance)


class CaptionViewSet(ValuesViewset):
    # Handles operations for the CaptionFile model.
    queryset = CaptionFile.objects.prefetch_related("caption_cue")
    permission_classes = [IsAuthenticated]
    serializer_class = CaptionFileSerializer
    values = ("file_id", "language", "caption_cue")

    field_map = {
        "file": "file_id",
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
    values = ("text", "starttime", "endtime", "caption_file")

    field_map = {
        "text": "text",
        "start_time": "starttime",
        "end_time": "endtime",
        "caption_file_id": "caption_file",
    }

    def list(self, request, *args, **kwargs):
        caption_file_id = kwargs['caption_file_id']
        queryset = CaptionCue.objects.filter(caption_file_id=caption_file_id)
        return Response(self.serialize(queryset))
