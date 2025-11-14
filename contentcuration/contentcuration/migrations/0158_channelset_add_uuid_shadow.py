# Generated manually for UUID migration - STEP 1
# Adds shadow UUID column to ChannelSet model
from django.db import migrations
import django.db.models as models


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0157_merge_20251015_0333"),
    ]

    operations = [
        migrations.AddField(
            model_name="channelset",
            name="id_uuid",
            field=models.UUIDField(
                blank=True,
                editable=False,
                null=True,
                unique=True,
            ),
        ),
    ]
