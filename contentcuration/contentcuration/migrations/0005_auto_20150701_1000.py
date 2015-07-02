# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0004_auto_20150630_1706'),
    ]

    operations = [
        migrations.AddField(
            model_name='contentnode',
            name='description',
            field=models.TextField(default='Description', help_text='Brief description of what this content item is', max_length=200, verbose_name='description'),
        ),
        migrations.AddField(
            model_name='contentnode',
            name='title',
            field=models.CharField(default='Title', help_text='Title of the content item', max_length=50, verbose_name='title'),
        ),
        migrations.AddField(
            model_name='topicnode',
            name='description',
            field=models.TextField(default='Description', help_text='Brief description of what is contained in this folder', max_length=200, verbose_name='description'),
        ),
        migrations.AddField(
            model_name='topicnode',
            name='title',
            field=models.CharField(default='Title', help_text='Folder title', max_length=50, verbose_name='title'),
        ),
    ]
