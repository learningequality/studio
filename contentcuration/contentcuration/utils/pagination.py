import hashlib

from django.core.cache import cache
from django.core.paginator import InvalidPage
from rest_framework.pagination import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CachedListPagination(PageNumberPagination):
    def paginate_queryset(self, queryset, request, view=None):
        """
        Overrides paginate_queryset from PageNumberPagination
        to assign the records count to the paginator.
        This count has been previously obtained in a less complex query,
        thus it has a better performance.

        """

        def cached_count(queryset):
            cache_key = (
                "query-count:"
                + hashlib.md5(str(queryset.query).encode("utf8")).hexdigest()
            )
            value = cache.get(cache_key)
            if value is None:
                value = queryset.values("id").count()
                cache.set(cache_key, value, 300)  # save the count for 5 minutes
            return value

        page_size = self.get_page_size(request)
        if not page_size:
            return None

        paginator = self.django_paginator_class(queryset, page_size)
        paginator.count = cached_count(queryset)
        page_number = request.query_params.get(self.page_query_param, 1)
        if page_number in self.last_page_strings:
            page_number = paginator.num_pages

        try:
            self.page = paginator.page(page_number)
        except InvalidPage as exc:
            msg = self.invalid_page_message.format(page_number=page_number, message=exc)
            raise NotFound(msg)

        if paginator.num_pages > 1 and self.template is not None:
            # The browsable API should display pagination controls.
            self.display_page_controls = True

        self.request = request
        return list(self.page)

    def get_paginated_response(self, data):
        return Response(
            {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "page_number": self.page.number,
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )


def get_order_queryset(request, queryset, field_map):
    """
    Function used to extract the field the queryset must be ordered by,
    and apply it correctly to the queryset
    """
    order = request.GET.get("sortBy", "")
    if not order:
        # frontend sends sometimes an 'ordering' parameter instead of sortBy (unknown reason)
        order = request.GET.get("ordering", "undefined")

    if request.GET.get("descending", "true") == "false" and order != "undefined":
        if order in field_map and type(field_map[order]) is str:
            order = field_map[order]
        order = "-" + order
        queryset = queryset.order_by(order)
    else:
        queryset = queryset.order_by()

    return (order, queryset)
