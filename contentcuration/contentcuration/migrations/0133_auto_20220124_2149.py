# Generated by Django 3.2.5 on 2022-01-24 21:49
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0132_auto_20210708_0011'),
    ]

    operations = [
        migrations.AddField(
            model_name='file',
            name='duration',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name='file',
            constraint=models.CheckConstraint(check=models.Q(models.Q(('duration__gt', 0), ('preset__in', ['audio', 'high_res_video', 'low_res_video'])), ('duration__isnull', True), _connector='OR'), name='file_media_duration_int'),
        ),
    ]
