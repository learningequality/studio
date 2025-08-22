"""
Avoiding direct model imports in here so that we can import these functions into places
that should not initiate the Django app registry.

Modified from:
https://github.com/learningequality/kolibri/blob/0f6bb6781a4453cd9fdc836d52b65dd69e395b20/kolibri/core/content/utils/search.py

With model import references changed to either contentcuration or kolibri_public as appropriate
and any non-Postgres logic removed in favour of Postgres only.
"""
import hashlib

from django.contrib.postgres.aggregates import BitOr
from django.core.cache import cache
from django.db.models import Case
from django.db.models import F
from django.db.models import Max
from django.db.models import Value
from django.db.models import When
from le_utils.constants.labels.accessibility_categories import (
    ACCESSIBILITYCATEGORIESLIST,
)
from le_utils.constants.labels.learning_activities import LEARNINGACTIVITIESLIST
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.subjects import SUBJECTSLIST


metadata_lookup = {
    "learning_activities": LEARNINGACTIVITIESLIST,
    "categories": SUBJECTSLIST,
    "grade_levels": LEVELSLIST,
    "accessibility_labels": ACCESSIBILITYCATEGORIESLIST,
    "learner_needs": NEEDSLIST,
}


metadata_bitmasks = {}

bitmask_fieldnames = {}


for key, labels in metadata_lookup.items():
    bitmask_lookup = {}
    i = 0
    while labels[i : i + 64]:
        bitmask_field_name = "{}_bitmask_{}".format(key, i)
        bitmask_fieldnames[bitmask_field_name] = []
        for j, label in enumerate(labels):
            info = {
                "bitmask_field_name": bitmask_field_name,
                "field_name": key,
                "bits": 2 ** j,
                "label": label,
            }
            bitmask_lookup[label] = info
            bitmask_fieldnames[bitmask_field_name].append(info)
        i += 64
    metadata_bitmasks[key] = bitmask_lookup


def _get_available_languages(base_queryset):
    # Updated to use contentcuration Language model
    from contentcuration.models import Language

    langs = Language.objects.filter(
        id__in=base_queryset.exclude(lang=None)
        .values_list("lang_id", flat=True)
        .distinct()
        # Updated to use contentcuration field names
        # Convert language objects to dicts mapped to the kolibri field names
    ).values("id", lang_name=F("native_name"))
    return list(langs)


def _get_available_channels(base_queryset):
    # Updated to use the kolibri_public ChannelMetadata model
    from kolibri_public.models import ChannelMetadata

    return list(
        ChannelMetadata.objects.filter(
            id__in=base_queryset.values_list("channel_id", flat=True).distinct()
        ).values("id", "name")
    )


# Remove the SQLite Bitwise OR definition as not needed.


def get_available_metadata_labels(base_queryset):
    # Updated to use the kolibri_public ChannelMetadata model
    from kolibri_public.models import ChannelMetadata

    content_cache_key = str(
        ChannelMetadata.objects.all().aggregate(updated=Max("last_updated"))["updated"]
    )
    cache_key = "search-labels:{}:{}".format(
        content_cache_key,
        hashlib.md5(str(base_queryset.query).encode("utf8")).hexdigest(),
    )
    if cache_key not in cache:
        base_queryset = base_queryset.order_by()
        aggregates = {}
        for field in bitmask_fieldnames:
            field_agg = field + "_agg"
            aggregates[field_agg] = BitOr(field)
        output = {}
        agg = base_queryset.aggregate(**aggregates)
        for field, values in bitmask_fieldnames.items():
            bit_value = agg[field + "_agg"]
            for value in values:
                if value["field_name"] not in output:
                    output[value["field_name"]] = []
                if bit_value is not None and bit_value & value["bits"]:
                    output[value["field_name"]].append(value["label"])
        output["languages"] = _get_available_languages(base_queryset)
        output["channels"] = _get_available_channels(base_queryset)
        cache.set(cache_key, output, timeout=None)
    return cache.get(cache_key)


def get_all_contentnode_label_metadata():
    # Updated to use the kolibri_public ContentNode model
    from kolibri_public.models import ContentNode

    return get_available_metadata_labels(ContentNode.objects.filter(available=True))


def annotate_label_bitmasks(queryset):
    update_statements = {}
    for bitmask_fieldname, label_info in bitmask_fieldnames.items():
        update_statements[bitmask_fieldname] = sum(
            Case(
                When(
                    **{
                        info["field_name"] + "__contains": info["label"],
                        "then": Value(info["bits"]),
                    }
                ),
                default=Value(0),
            )
            for info in label_info
        )
    queryset.update(**update_statements)
