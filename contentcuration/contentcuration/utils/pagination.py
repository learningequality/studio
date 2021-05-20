import hashlib

from django.core.cache import cache
from django.core.exceptions import EmptyResultSet
from django.core.paginator import InvalidPage
from django.core.paginator import Page
from django.core.paginator import Paginator
from django.db.models import QuerySet
from django.utils.functional import cached_property
from rest_framework.pagination import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class ValuesPage(Page):
    def __init__(self, object_list, number, paginator):
        self.queryset = object_list
        self.object_list = object_list
        self.number = number
        self.paginator = paginator


class ValuesViewsetPaginator(Paginator):
    def __init__(self, object_list, *args, **kwargs):
        if not isinstance(object_list, QuerySet):
            raise TypeError("ValuesViewsetPaginator is only intended for use with Querysets")
        self.queryset = object_list
        object_list = object_list.values_list("pk", flat=True).distinct()
        return super(ValuesViewsetPaginator, self).__init__(object_list, *args, **kwargs)

    def _get_page(self, object_list, *args, **kwargs):
        pks = list(object_list)
        return ValuesPage(self.queryset.filter(pk__in=pks), *args, **kwargs)


class CachedValuesViewsetPaginator(ValuesViewsetPaginator):
    @cached_property
    def count(self):
        try:
            query_string = str(self.object_list.query).encode("utf8")
            cache_key = (
                "query-count:"
                + hashlib.md5(query_string).hexdigest()
            )
            value = cache.get(cache_key)
            if value is None:
                value = super(CachedValuesViewsetPaginator, self).count
                cache.set(cache_key, value, 300)  # save the count for 5 minutes
        except EmptyResultSet:
            # If the query is an empty result set, then this error will be raised by
            # Django - this happens, for example when doing a pk__in=[] query
            # In this case, we know the value is just 0!
            value = 0
        return value


class ValuesViewsetPageNumberPagination(PageNumberPagination):
    django_paginator_class = ValuesViewsetPaginator

    def paginate_queryset(self, queryset, request, view=None):
        """
        Paginate a queryset if required, either returning a
        page object, or `None` if pagination is not configured for this view.
        """
        page_size = self.get_page_size(request)
        if not page_size:
            return None

        paginator = self.django_paginator_class(queryset, page_size)
        page_number = request.query_params.get(self.page_query_param, 1)
        if page_number in self.last_page_strings:
            page_number = paginator.num_pages

        try:
            self.page = paginator.page(page_number)
        except InvalidPage as exc:
            msg = self.invalid_page_message.format(
                page_number=page_number, message=str(exc)
            )
            raise NotFound(msg)

        if paginator.num_pages > 1 and self.template is not None:
            # The browsable API should display pagination controls.
            self.display_page_controls = True

        self.request = request
        return self.page.queryset

    def get_paginated_response(self, data):
        return Response(
            {
                "page": self.page.number,
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'count': {
                    'type': 'integer',
                    'example': 123,
                },
                'results': schema,
                'page': {
                    'type': 'integer',
                    'example': 123,
                },
                'total_pages': {
                    'type': 'integer',
                    'example': 123,
                },
            },
        }


class CachedListPagination(ValuesViewsetPageNumberPagination):
    django_paginator_class = CachedValuesViewsetPaginator
