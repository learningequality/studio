import uuid

from django.db import models
from kolibri_public.models import ContentNode

from contentcuration.models import Channel


REQUEST_HASH_INDEX_NAME = "request_hash_idx"
CONTENTNODE_INDEX_NAME = "contentnode_idx"


class RecommendationsCache(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_hash = models.CharField(max_length=32, null=True)
    topic_id = models.UUIDField()
    contentnode = models.ForeignKey(
        ContentNode,
        null=True,
        blank=True,
        related_name="contentnode_recommendations",
        on_delete=models.CASCADE,
    )
    channel = models.ForeignKey(
        Channel,
        null=True,
        blank=True,
        related_name="channel_recommendations",
        on_delete=models.CASCADE,
    )
    rank = models.IntegerField(default=0, null=True)
    override_threshold = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("request_hash", "contentnode")
        indexes = [
            models.Index(fields=["request_hash"], name=REQUEST_HASH_INDEX_NAME),
            models.Index(fields=["contentnode"], name=CONTENTNODE_INDEX_NAME),
        ]
