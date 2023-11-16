from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class TranscriptionsViewSet(ViewSet):
    def create(self, request):
        permission_classes = [AllowAny]
        return Response({
            "OK":"OK"
        })