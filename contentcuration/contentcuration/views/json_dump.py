import json

from django.core.serializers.json import DjangoJSONEncoder
from rest_framework.renderers import JSONRenderer

"""
Format data such that it can be safely loaded by JSON.parse in javascript
  1. create a JSON string
  2. second, correctly wrap the JSON in quotes for inclusion in JS

Ref:  https://github.com/learningequality/kolibri/issues/6044
"""


def _json_dumps(value):
    """
    json.dumps parameters for dumping unicode into JS
    """
    return json.dumps(
        value, separators=(",", ":"), ensure_ascii=False, cls=DjangoJSONEncoder
    )


def json_for_parse_from_data(data):
    return _json_dumps(_json_dumps(data))


def json_for_parse_from_serializer(serializer):
    return _json_dumps(JSONRenderer().render(serializer.data).decode("utf-8"))
