from django.contrib.postgres.search import SearchQuery
from search.constants import POSTGRES_FTS_CONFIG


def get_fts_search_query(value):
    """
    Returns a `SearchQuery` with our postgres full text search config set on it.
    """
    return SearchQuery(value=value, config=POSTGRES_FTS_CONFIG)
