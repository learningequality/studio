import uuid

from django.db import models
from kolibri_public.models import ContentNode


class RecommendationsCache(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_hash = models.CharField(max_length=32, null=True)
    response = models.ForeignKey(
        ContentNode,
        null=True,
        blank=True,
        related_name='recommendations',
        on_delete=models.SET_NULL,
    )
    rank = models.FloatField(default=0.0, null=True)
    override_threshold = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
