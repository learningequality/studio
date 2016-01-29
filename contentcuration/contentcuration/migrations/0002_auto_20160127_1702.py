# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import mptt.fields


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='channel',
            name='clipboard',
            field=mptt.fields.TreeForeignKey(related_name='clipboard', blank=True, to='contentcuration.TopicTree', null=True),
        ),
        migrations.AddField(
            model_name='channel',
            name='deleted',
            field=mptt.fields.TreeForeignKey(related_name='deleted', blank=True, to='contentcuration.TopicTree', null=True),
        ),
        migrations.AddField(
            model_name='channel',
            name='draft',
            field=mptt.fields.TreeForeignKey(related_name='draft', blank=True, to='contentcuration.TopicTree', null=True),
        ),
        migrations.AddField(
            model_name='channel',
            name='published',
            field=mptt.fields.TreeForeignKey(related_name='published', blank=True, to='contentcuration.TopicTree', null=True),
        ),
    ]
