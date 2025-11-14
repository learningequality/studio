# Generated manually for UUID migration - STEP 6
# Update models to use native UUID fields
# This is a no-op migration - DB already has UUID columns after cutover
# This just updates Django's field definitions to match reality

import uuid
from django.conf import settings
from django.db import migrations
import django.db.models as models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("contentcuration", "0161_channelset_cutover"),
    ]

    operations = [
        # Update ChannelSet.id to be native UUIDField
        migrations.AlterField(
            model_name="channelset",
            name="id",
            field=models.UUIDField(
                default=uuid.uuid4,
                primary_key=True,
                serialize=False,
            ),
        ),
        # Update ChannelSetEditors.channelset to be regular ForeignKey
        # (pointing to UUID column now)
        migrations.AlterField(
            model_name="channelseteditors",
            name="channelset",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to="contentcuration.channelset",
            ),
        ),
    ]
