import uuid

from django.db import models
from django.db.models import JSONField


class RecommendationsCache(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = JSONField(default=dict, null=True)
    response = JSONField(default=dict, null=True)
    rank = models.FloatField(default=0.0, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
