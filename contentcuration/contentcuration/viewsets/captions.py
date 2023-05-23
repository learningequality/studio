from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from contentcuration.models import GeneratedCaptions


class GeneratedCaptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedCaptions
        fields = ['id', 'generated_captions', 'language']

class CaptionViewSet(ModelViewSet):
    queryset = GeneratedCaptions.objects.all()
    serializer_class = GeneratedCaptionsSerializer

    def create(self, request):
        # handles the creation operation and return serialized data
        pass

    def update(self, request):
        # handles the updating of an existing `GeneratedCaption` instance.
        pass
    
    def destroy(self, request):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)