from http import HTTPStatus

import jsonschema
from django.http import HttpResponseServerError
from django.http import JsonResponse
from le_utils.validators import embed_topics_request
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from contentcuration.utils.automation_manager import AutomationManager


class RecommendationSerializer(serializers.Serializer):
    topics = serializers.ListField(required=True)
    metadata = serializers.JSONField(required=False)
    override_threshold = serializers.BooleanField(default=False)

    def validate(self, data):
        try:
            validation_data = {'topics': data['topics']}
            if 'metadata' in data:
                validation_data['metadata'] = data['metadata']

            embed_topics_request.validate(validation_data)
            return data
        except jsonschema.ValidationError as e:
            raise serializers.ValidationError(str(e))


class RecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = RecommendationSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        topics = serializer.validated_data['topics']
        metadata = serializer.validated_data.get('metadata', None)
        override_threshold = serializer.validated_data['override_threshold']

        try:
            manager = AutomationManager()

            request_data = {'topics': topics}
            if metadata is not None:
                request_data['metadata'] = metadata

            recommendations = manager.load_recommendations(request_data, override_threshold)
            return JsonResponse(data=recommendations, safe=False)
        except (ValueError, TypeError) as e:
            return JsonResponse({"error": str(e)}, status=HTTPStatus.BAD_REQUEST)
        except ConnectionError as e:
            return JsonResponse({"error": f"Recommendation service unavailable: {str(e)}"},
                                status=HTTPStatus.SERVICE_UNAVAILABLE)
        except Exception as e:
            return HttpResponseServerError(f"Unable to load recommendations: {str(e)}")
