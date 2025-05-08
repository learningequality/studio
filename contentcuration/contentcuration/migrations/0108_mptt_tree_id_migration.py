# -*- coding: utf-8 -*-
from django.db import migrations
from django.db import models

from contentcuration.models import ContentNode


def delete_tree_id_records(apps, schema_editor):
    """
    Note that this technically does not reverse the migration, as IDs are not re-used after deletion,
    but just returns the table to an empty state undoing the record creation.
    """
    MPTTTreeIDManager = apps.get_model("contentcuration", "MPTTTreeIDManager")
    MPTTTreeIDManager.objects.all().delete()


def update_tree_id_integer(apps, schema_editor):
    MPTTTreeIDManager = apps.get_model("contentcuration", "MPTTTreeIDManager")
    # In tests, we won't have any existing MPTT trees, so this will return None.
    max_id = (
        ContentNode.objects.filter(parent=None).aggregate(max_id=models.Max("tree_id"))[
            "max_id"
        ]
        or 0
    )
    objects = []
    for i in range(max_id):
        objects.append(MPTTTreeIDManager())

    if len(objects) > 0:
        MPTTTreeIDManager.objects.bulk_create(objects)


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0107_auto_20191115_2344"),
    ]

    operations = [
        migrations.RunPython(
            update_tree_id_integer, reverse_code=delete_tree_id_records
        ),
    ]
