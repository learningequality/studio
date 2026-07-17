from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0024_file_included_presets"),
    ]

    operations = [
        migrations.AddField(
            model_name="localfile",
            name="file_size_bigint",
            field=models.BigIntegerField(blank=True, null=True),
        ),
    ]
