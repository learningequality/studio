from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from contentcuration.models import Caption


class CaptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caption
        fields = ["id", "caption", "language"]


class CaptionViewSet(ModelViewSet):
    queryset = Caption.objects.all()
    serializer_class = CaptionSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            self.perform_create(serializer=serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data, headers=headers, status=status.HTTP_201_CREATED
            )

    def update(self, request, pk=None):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if not serializer.is_valid(raise_exception=True):
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
