# Generated by Django 3.2.24 on 2024-07-24 13:18
import uuid

import django.db.models.deletion
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('kolibri_public', '0003_alter_file_preset'),
    ]

    operations = [
        migrations.CreateModel(
            name='RecommendationsCache',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True,
                                        serialize=False)),
                ('request_hash', models.CharField(max_length=32, null=True)),
                ('rank', models.FloatField(default=0.0, null=True)),
                ('override_threshold', models.BooleanField(default=False)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('response', models.ForeignKey(blank=True, null=True,
                                               on_delete=django.db.models.deletion.SET_NULL,
                                               related_name='recommendations',
                                               to='kolibri_public.contentnode')),
            ],
        ),
    ]
