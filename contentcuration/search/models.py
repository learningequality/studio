import uuid

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector
from django.contrib.postgres.search import SearchVectorField
from django.db import models

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import UUIDField as StudioUUIDField


class SavedSearch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    params = models.JSONField(default=dict)
    saved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="searches", on_delete=models.CASCADE
    )


POSTGRES_FTS_CONFIG = "simple"

CONTENTNODE_KEYWORDS_TSVECTOR_FIELDS = ("id", "channel_id", "node_id", "content_id", "tree_id", "title", "description", "contentnode_tags")
CONTENTNODE_KEYWORDS_TSVECTOR = SearchVector(*CONTENTNODE_KEYWORDS_TSVECTOR_FIELDS, config=POSTGRES_FTS_CONFIG)

CONTENTNODE_AUTHOR_TSVECTOR_FIELDS = ("author", "aggregator", "provider")
CONTENTNODE_AUTHOR_TSVECTOR = SearchVector(*CONTENTNODE_AUTHOR_TSVECTOR_FIELDS, config=POSTGRES_FTS_CONFIG)

CHANNEL_KEYWORDS_TSVECTOR_FIELDS = ("id", "main_tree__tree_id", "name", "description", "tagline", "primary_channel_token")
CHANNEL_KEYWORDS_TSVECTOR = SearchVector(*CHANNEL_KEYWORDS_TSVECTOR_FIELDS, config=POSTGRES_FTS_CONFIG)


class ContentNodeFullTextSearch(models.Model):
    id = StudioUUIDField(primary_key=True, default=uuid.uuid4)

    # The contentnode that this record points to.
    contentnode = models.ForeignKey(ContentNode, on_delete=models.CASCADE, related_name="node_fts")

    # The channel to which the contentnode belongs. Channel cannot be NULL because we only allow
    # searches to be made inside channels.
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="channel_nodes_fts")

    # This stores the keywords as tsvector.
    keywords_tsvector = SearchVectorField(null=True, blank=True)

    # This stores the author as tsvector.
    author_tsvector = SearchVectorField(null=True, blank=True)

    class Meta:
        indexes = [GinIndex(fields=["keywords_tsvector"], name="node_keywords_tsv__gin_idx"),
                   GinIndex(fields=["author_tsvector"], name="node_author_tsv__gin_idx")]


class ChannelFullTextSearch(models.Model):
    id = StudioUUIDField(primary_key=True, default=uuid.uuid4)

    # The channel to which this record points.
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="channel_fts")

    # This stores the channel keywords as tsvector for super fast searches.
    keywords_tsvector = SearchVectorField(null=True, blank=True)

    class Meta:
        indexes = [GinIndex(fields=["keywords_tsvector"], name="channel_keywords_tsv__gin_idx")]
