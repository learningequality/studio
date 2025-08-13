from django.contrib.postgres.search import SearchVector

# Postgres full text search configuration. We use "simple" to make search
# language agnostic.
POSTGRES_FTS_CONFIG = "simple"

# ContentNode vectors and search fields.
CONTENTNODE_KEYWORDS_TSVECTOR_FIELDS = (
    "id",
    "channel_id",
    "node_id",
    "content_id",
    "tree_id",
    "title",
    "description",
    "contentnode_tags",
)
CONTENTNODE_KEYWORDS_TSVECTOR = SearchVector(
    *CONTENTNODE_KEYWORDS_TSVECTOR_FIELDS, config=POSTGRES_FTS_CONFIG
)

CONTENTNODE_AUTHOR_TSVECTOR_FIELDS = ("author", "aggregator", "provider")
CONTENTNODE_AUTHOR_TSVECTOR = SearchVector(
    *CONTENTNODE_AUTHOR_TSVECTOR_FIELDS, config=POSTGRES_FTS_CONFIG
)

# Channel vector and search fields.
CHANNEL_KEYWORDS_TSVECTOR_FIELDS = (
    "id",
    "main_tree__tree_id",
    "name",
    "description",
    "tagline",
    "primary_channel_token",
)
CHANNEL_KEYWORDS_TSVECTOR = SearchVector(
    *CHANNEL_KEYWORDS_TSVECTOR_FIELDS, config=POSTGRES_FTS_CONFIG
)
