from django.contrib.postgres.aggregates import ArrayAgg as BaseArrayAgg


class ArrayAgg(BaseArrayAgg):
    template = "%(function)s(%(distinct)s%(expressions)s)"

    def __init__(self, *args, **kwargs):
        kwargs.update(distinct='DISTINCT ' if kwargs.pop('distinct') else '')
        super(ArrayAgg, self).__init__(*args, **kwargs)
