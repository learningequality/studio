import datetime
import json
import re
import uuid

import pytz
from django.db import models
from django.db.backends.utils import typecast_timestamp
from django.db.models.fields import Field
from django.utils import timezone
from jsonfield import JSONField as JSONFieldBase


date_time_format = "%Y-%m-%d %H:%M:%S.%f"
tz_format = "({tz})"
tz_regex = re.compile(r"\(([^\)]+)\)")
db_storage_string = "{date_time_string}{tz_string}"


def parse_timezonestamp(value):
    if tz_regex.search(value):
        tz = pytz.timezone(tz_regex.search(value).groups()[0])
    else:
        tz = timezone.get_current_timezone()
    utc_value = tz_regex.sub("", value)
    value = typecast_timestamp(utc_value)
    if value.tzinfo is None:
        # Naive datetime, make aware
        value = timezone.make_aware(value, pytz.utc)
    return value.astimezone(tz)


def create_timezonestamp(value):
    if value.tzinfo and hasattr(value.tzinfo, "zone"):
        # We have a pytz timezone, we can work with this
        tz = value.tzinfo.zone
    elif value.tzinfo:
        # Got some timezone data, but it's not a pytz timezone
        # Let's just assume someone used dateutil parser on a UTC
        # ISO format timestamp
        # Fixes https://github.com/learningequality/kolibri/issues/1824
        tz = pytz.utc
        value = value.astimezone(tz)
    else:
        tz = timezone.get_current_timezone().zone
        value = timezone.make_aware(value, timezone.get_current_timezone())
    date_time_string = value.astimezone(pytz.utc).strftime(date_time_format)
    tz_string = tz_format.format(tz=tz)
    value = db_storage_string.format(
        date_time_string=date_time_string, tz_string=tz_string
    )
    return value


class DateTimeTzField(Field):
    """
    A field that stores datetime information as a char in this format:

    %Y-%m-%d %H:%M:%S.%f(<tzinfo>)

    It reads a timezone aware datetime object, and extracts the timezone zone information
    then parses the datetime into the format above with the timezone information appended.

    As this is ISO formatted, alphabetic sorting should still allow for proper queries
    against this in the database. Mostly engineered for SQLite usage.
    Vendored from Kolibri:
    https://github.com/learningequality/kolibri/blob/0f6bb6781a4453cd9fdc836d52b65dd69e395b20/kolibri/core/fields.py#L54
    """

    def db_type(self, connection):
        return "varchar"

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return parse_timezonestamp(value)

    def to_python(self, value):
        if isinstance(value, datetime.datetime):
            return value

        if value is None:
            return value

        return parse_timezonestamp(value)

    def get_prep_value(self, value):
        # Casts datetimes into the format expected by the backend
        if value is None:
            return value
        if isinstance(value, str):
            value = parse_timezonestamp(value)
        return create_timezonestamp(value)

    def get_db_prep_value(self, value, connection, prepared=False):
        if not prepared:
            value = self.get_prep_value(value)
        return value

    def value_from_object_json_compatible(self, obj):
        if self.value_from_object(obj):
            return create_timezonestamp(self.value_from_object(obj))


class JSONField(JSONFieldBase):
    """
    This may have been corrected in the 3.0 release of JSONField, but we copy the Kolibri
    implementation here to be sure:
    https://github.com/learningequality/kolibri/blob/0f6bb6781a4453cd9fdc836d52b65dd69e395b20/kolibri/core/fields.py#L102
    """

    def from_db_value(self, value, expression, connection):
        if isinstance(value, str):
            try:
                return json.loads(value, **self.load_kwargs)
            except ValueError:
                pass

        return value

    def to_python(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value, **self.load_kwargs)
            except ValueError:
                pass

        return value


class UUIDField(models.CharField):
    """
    Adaptation of Django's UUIDField, but with 32-char hex representation as Python representation rather than a UUID instance.
    Vendored from Morango:
    https://github.com/learningequality/morango/blob/fd882f6f6dfa9a786ee678b9f99039a5199a6ed6/morango/models/fields/uuids.py#L12
    """

    def __init__(self, *args, **kwargs):
        kwargs["max_length"] = 32
        super(UUIDField, self).__init__(*args, **kwargs)

    def prepare_value(self, value):
        if isinstance(value, uuid.UUID):
            return value.hex
        return value

    def deconstruct(self):
        name, path, args, kwargs = super(UUIDField, self).deconstruct()
        del kwargs["max_length"]
        return name, path, args, kwargs

    def get_internal_type(self):
        return "UUIDField"

    def get_db_prep_value(self, value, connection, prepared=False):
        if value is None:
            return None
        if not isinstance(value, uuid.UUID):
            try:
                value = uuid.UUID(value)
            except AttributeError:
                raise TypeError(self.error_messages["invalid"] % {"value": value})
        return value.hex

    def from_db_value(self, value, expression, connection):
        return self.to_python(value)

    def to_python(self, value):
        if isinstance(value, uuid.UUID):
            return value.hex
        return value

    def get_default(self):
        """
        Returns the default value for this field.
        """
        if self.has_default():
            if callable(self.default):
                default = self.default()
                if isinstance(default, uuid.UUID):
                    return default.hex
                return default
            if isinstance(self.default, uuid.UUID):
                return self.default.hex
            return self.default
        return None
