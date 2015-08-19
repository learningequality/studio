# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
import mptt.fields


class Migration(migrations.Migration):

    replaces = [(b'contentcuration', '0001_initial'), (b'contentcuration', '0002_auto_20150630_1700'), (b'contentcuration', '0003_auto_20150630_1703'), (b'contentcuration', '0004_auto_20150630_1706'), (b'contentcuration', '0005_auto_20150701_1000'), (b'contentcuration', '0006_channel_author'), (b'contentcuration', '0007_auto_20150714_1641'), (b'contentcuration', '0008_topictree_parent'), (b'contentcuration', '0009_auto_20150717_1140'), (b'contentcuration', '0010_auto_20150717_1156')]

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ContentLicense',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(help_text="Name of license, e.g. 'Creative Commons Share-Alike 2.0'", max_length=255, verbose_name='name')),
            ],
        ),
        migrations.CreateModel(
            name='Node',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='created')),
                ('modified', models.DateTimeField(auto_now=True, verbose_name='modified')),
                ('name', models.CharField(help_text='Name of node to be displayed to the user in the menu', max_length=50, verbose_name='name')),
                ('published', models.BooleanField(default=False, help_text='If published, students can access this item', verbose_name='Published')),
                ('deleted', models.BooleanField(default=False, help_text='Indicates that the node has been deleted, and should only be retrievable through the admin backend', verbose_name='Deleted')),
                ('sort_order', models.FloatField(default=0, help_text='Ascending, lowest number shown first', unique=True, max_length=50, verbose_name='sort order')),
                ('lft', models.PositiveIntegerField(editable=False, db_index=True)),
                ('rght', models.PositiveIntegerField(editable=False, db_index=True)),
                ('tree_id', models.PositiveIntegerField(editable=False, db_index=True)),
                ('level', models.PositiveIntegerField(editable=False, db_index=True)),
            ],
            options={
                'verbose_name': 'Topic',
                'verbose_name_plural': 'Topics',
            },
        ),
        migrations.CreateModel(
            name='TopicTree',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(help_text='Displayed to the user', max_length=255, verbose_name='channel name')),
                ('lft', models.PositiveIntegerField(editable=False, db_index=True)),
                ('rght', models.PositiveIntegerField(editable=False, db_index=True)),
                ('tree_id', models.PositiveIntegerField(editable=False, db_index=True)),
                ('level', models.PositiveIntegerField(editable=False, db_index=True)),
                ('editors', models.ManyToManyField(help_text='Users with edit rights', to=settings.AUTH_USER_MODEL, verbose_name='editors')),
            ],
            options={
                'verbose_name': 'Topic tree',
                'verbose_name_plural': 'Topic trees',
            },
        ),
        migrations.CreateModel(
            name='ContentNode',
            fields=[
                ('node_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='contentcuration.Node')),
                ('author', models.CharField(help_text='Name of the author(s) of book/movie/exercise', max_length=255)),
                ('license_owner', models.CharField(help_text='Organization of person who holds the essential rights', max_length=255, null=True, blank=True)),
                ('published_on', models.DateField(help_text='If applicable, state when this work was first published (not on this platform, but for its original publication).', null=True, blank=True)),
                ('retrieved_on', models.DateTimeField(help_text='Should be automatically filled in when an item is downloaded from its source of origin, either manually by user or automatically by script.', null=True, verbose_name='downloaded on', blank=True)),
                ('content_file', models.FileField(help_text='Upload video here', null=True, upload_to=b'contents/video/thumbnails/', blank=True)),
                ('thumbnail', models.ImageField(help_text='Automatically created when new video is uploaded', null=True, upload_to=b'contents/video/thumbnails/', blank=True)),
                ('license', models.ForeignKey(verbose_name='license', to='contentcuration.ContentLicense', help_text='License under which the work is distributed')),
                ('description', models.TextField(default='Description', help_text='Brief description of what this content item is', max_length=200, verbose_name='description')),
                ('title', models.CharField(default='Title', help_text='Title of the content item', max_length=50, verbose_name='title')),
            ],
            options={
                'abstract': False,
            },
            bases=('contentcuration.node',),
        ),
        migrations.CreateModel(
            name='TopicNode',
            fields=[
                ('node_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='contentcuration.Node')),
                ('color1', models.CharField(max_length=7)),
                ('color2', models.CharField(max_length=7)),
                ('color3', models.CharField(max_length=7)),
                ('description', models.TextField(default='Description', help_text='Brief description of what is contained in this folder', max_length=200, verbose_name='description')),
                ('title', models.CharField(default='Title', help_text='Folder title', max_length=50, verbose_name='title')),
            ],
            options={
                'abstract': False,
            },
            bases=('contentcuration.node',),
        ),
        migrations.AddField(
            model_name='topictree',
            name='root_node',
            field=models.ForeignKey(verbose_name='root node', to='contentcuration.Node', help_text='The starting point for the tree, the title of it is the title shown in the menu', null=True),
        ),
        migrations.AddField(
            model_name='node',
            name='parent',
            field=mptt.fields.TreeForeignKey(related_name='children', blank=True, to='contentcuration.Node', null=True),
        ),
        migrations.AlterUniqueTogether(
            name='node',
            unique_together=set([('parent', 'name')]),
        ),
        migrations.CreateModel(
            name='Channel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=100, verbose_name='channel name')),
                ('description', models.TextField(help_text='Description of what a channel contains', max_length=300, verbose_name='channel description')),
                ('author', models.CharField(default='', help_text='Channel author can be a person or an organization', max_length=100, verbose_name='channel author')),
                ('editors', models.ManyToManyField(help_text='Users with edit rights', to=settings.AUTH_USER_MODEL, verbose_name='editors')),
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
            model_name='topictree',
            name='name',
            field=models.CharField(help_text='Displayed to the user', max_length=255, verbose_name='topic tree name'),
        ),
        migrations.AddField(
            model_name='contentlicense',
            name='exists',
            field=models.BooleanField(default=False, help_text='Tells whether or not a content item is licensed to share', verbose_name='license exists'),
        ),
        migrations.AlterField(
            model_name='contentlicense',
            name='name',
            field=models.CharField(default=b'', help_text="Name of license, e.g. 'Creative Commons Share-Alike 2.0'", max_length=255, verbose_name='name'),
        ),
        migrations.RemoveField(
            model_name='topictree',
            name='editors',
        ),
        migrations.RemoveField(
            model_name='topictree',
            name='level',
        ),
        migrations.RemoveField(
            model_name='topictree',
            name='lft',
        ),
        migrations.RemoveField(
            model_name='topictree',
            name='rght',
        ),
        migrations.RemoveField(
            model_name='topictree',
            name='tree_id',
        ),
        migrations.AddField(
            model_name='topictree',
            name='channel',
            field=models.ForeignKey(verbose_name='channel', to='contentcuration.Channel', help_text='For different versions of the tree in the same channel (trash, edit, workspace)', null=True),
        ),
    ]
