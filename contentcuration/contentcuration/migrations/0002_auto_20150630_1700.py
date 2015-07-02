# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Channel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('channel_name', models.CharField(max_length=100, verbose_name='channel name')),
                ('description', models.TextField(help_text='Description of what a channel contains', max_length=300, verbose_name='channel description')),
                ('lft', models.PositiveIntegerField(editable=False, db_index=True)),
                ('rght', models.PositiveIntegerField(editable=False, db_index=True)),
                ('tree_id', models.PositiveIntegerField(editable=False, db_index=True)),
                ('level', models.PositiveIntegerField(editable=False, db_index=True)),
            ],
            options={
                'verbose_name': 'Channel',
                'verbose_name_plural': 'Channels',
            },
        ),
        migrations.AddField(
            model_name='topictree',
            name='is_published',
            field=models.BooleanField(default=False, help_text='If published, students can access this channel', verbose_name='Published'),
        ),
        migrations.AlterField(
            model_name='contentnode',
            name='content_file',
            field=models.FileField(help_text='Upload video here', null=True, upload_to=b'contents/video/thumbnails/', blank=True),
        ),
        migrations.AlterField(
            model_name='topictree',
            name='name',
            field=models.CharField(help_text='Displayed to the user', max_length=255, verbose_name='topic tree name'),
        ),
        migrations.AddField(
            model_name='channel',
            name='primary_topic_tree',
            field=models.ForeignKey(help_text='Primary topic tree associated with this channel', to='contentcuration.TopicTree'),
        ),
    ]
