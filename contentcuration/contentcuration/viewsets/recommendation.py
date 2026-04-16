import logging
from http import HTTPStatus

import jsonschema
from automation.utils.appnexus import errors
from django.http import HttpResponseServerError
from django.http import JsonResponse
from le_utils.constants import embed_topics_request
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from contentcuration.utils.automation_manager import AutomationManager

logger = logging.getLogger(__name__)


def validate_recommendations_request(data):
    jsonschema.validate(instance=data, schema=embed_topics_request.SCHEMA)


class RecommendationView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]
    manager = AutomationManager()

    def post(self, request):
        try:
            request_data = request.data
            # Remove and store override_threshold as it isn't defined in the schema
            override_threshold = request_data.pop("override_threshold", False)

            validate_recommendations_request(request_data)
        except jsonschema.ValidationError as e:
            logger.error("Schema validation error: %s", str(e))
            return JsonResponse(
                {"error": "Invalid request data. Please check the required fields."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            recommendations = self.manager.load_recommendations(
                request_data, override_threshold
            )
            return JsonResponse(data=recommendations, safe=False)
        except errors.InvalidRequest:
            return JsonResponse(
                {"error": "Invalid input provided."}, status=HTTPStatus.BAD_REQUEST
            )
        except errors.ConnectionError:
            return JsonResponse(
                {"error": "Recommendation service unavailable"},
                status=HTTPStatus.SERVICE_UNAVAILABLE,
            )
        except errors.TimeoutError:
            return JsonResponse(
                {"error": "Connection to recommendation service timed out"},
                status=HTTPStatus.REQUEST_TIMEOUT,
            )
        except errors.HttpError:
            return HttpResponseServerError("Unable to load recommendations")
