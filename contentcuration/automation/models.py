import uuid

from django.db import models
from django.db.models import JSONField


class RecommendationsCache(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = JSONField(default=dict, null=True)
    response = JSONField(default=dict, null=True)
    priority = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)
