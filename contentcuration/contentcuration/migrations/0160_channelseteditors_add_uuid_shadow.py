# Generated manually for UUID migration - STEP 3
# Adds shadow UUID column to ChannelSetEditors through model
from django.db import migrations
import django.db.models as models


class Migration(migrations.Migration):

    dependencies = [
        ("contentcuration", "0159_channelset_explicit_through"),
    ]

    operations = [
        migrations.AddField(
            model_name="channelseteditors",
            name="channelset_id_uuid",
            field=models.UUIDField(
                blank=True,
                db_index=True,
                editable=False,
                null=True,
            ),
        ),
    ]
