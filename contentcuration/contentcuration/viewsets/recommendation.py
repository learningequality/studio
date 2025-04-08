from http import HTTPStatus

import jsonschema
from django.http import HttpResponseServerError
from django.http import JsonResponse
from le_utils.validators import embed_topics_request
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from contentcuration.utils.automation_manager import AutomationManager
from contentcuration.viewsets.user import IsAIFeatureEnabledForUser


class RecommendationView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsAIFeatureEnabledForUser,
    ]
    manager = AutomationManager()

    def post(self, request):
        try:
            request_data = request.data
            # Remove and store override_threshold as it isn't defined in the schema
            override_threshold = request_data.pop('override_threshold', False)

            embed_topics_request.validate(request_data)
        except jsonschema.ValidationError as e:
            return JsonResponse({"error": f"Required fields missing: {str(e)}"}, status=HTTPStatus.BAD_REQUEST)

        try:
            recommendations = self.manager.load_recommendations(request_data, override_threshold)
            return JsonResponse(data=recommendations, safe=False)
        except (ValueError, TypeError) as e:
            return JsonResponse({"error": str(e)}, status=HTTPStatus.BAD_REQUEST)
        except ConnectionError as e:
            return JsonResponse({"error": f"Recommendation service unavailable: {str(e)}"},
                                status=HTTPStatus.SERVICE_UNAVAILABLE)
        except Exception as e:
            return HttpResponseServerError(f"Unable to load recommendations: {str(e)}")
