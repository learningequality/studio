from django.db.models.aggregates import Aggregate
from django.db.models.fields import BooleanField


class BoolOr(Aggregate):
    function = 'BOOL_OR'
    name = 'Bool_Or'
    _output_field = BooleanField()
