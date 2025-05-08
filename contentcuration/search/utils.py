from django.contrib.postgres.aggregates import StringAgg
from django.contrib.postgres.search import SearchQuery
from django.db.models import Value
from search.constants import CHANNEL_KEYWORDS_TSVECTOR
from search.constants import CONTENTNODE_AUTHOR_TSVECTOR
from search.constants import CONTENTNODE_KEYWORDS_TSVECTOR
from search.constants import POSTGRES_FTS_CONFIG


def get_fts_search_query(value):
    """
    Returns a `SearchQuery` with our postgres full text search config set on it.
    """
    return SearchQuery(value=value, config=POSTGRES_FTS_CONFIG)


def get_fts_annotated_contentnode_qs(channel_id):
    """
    Returns a `ContentNode` queryset annotated with fields required for full text search.
    """
    from contentcuration.models import ContentNode

    return ContentNode.objects.annotate(
        channel_id=Value(channel_id),
        contentnode_tags=StringAgg("tags__tag_name", delimiter=" "),
        keywords_tsvector=CONTENTNODE_KEYWORDS_TSVECTOR,
        author_tsvector=CONTENTNODE_AUTHOR_TSVECTOR,
    )


def get_fts_annotated_channel_qs():
    """
    Returns a `Channel` queryset annotated with fields required for full text search.
    """
    from contentcuration.models import Channel
    from contentcuration.viewsets.channel import primary_token_subquery

    return Channel.objects.annotate(
        primary_channel_token=primary_token_subquery,
        keywords_tsvector=CHANNEL_KEYWORDS_TSVECTOR,
    )
