# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
import mptt.fields


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AssessmentItem',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.CharField(default=b'multiplechoice', max_length=50)),
                ('question', models.TextField(blank=True)),
                ('answers', models.TextField(default=b'[]')),
            ],
        ),
        migrations.CreateModel(
            name='Channel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=100, verbose_name='channel name')),
                ('description', models.TextField(help_text='Description of what a channel contains', max_length=300, verbose_name='channel description')),
                ('author', models.CharField(help_text='Channel author can be a person or an organization', max_length=100, verbose_name='channel author')),
                ('editors', models.ManyToManyField(help_text='Users with edit rights', to=settings.AUTH_USER_MODEL, verbose_name='editors')),
            ],
            options={
                'verbose_name': 'Channel',
                'verbose_name_plural': 'Channels',
            },
        ),
        migrations.CreateModel(
            name='ContentLicense',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(default=b'', help_text="Name of license, e.g. 'Creative Commons Share-Alike 2.0'", max_length=255, verbose_name='name')),
                ('exists', models.BooleanField(default=False, help_text='Tells whether or not a content item is licensed to share', verbose_name='license exists')),
            ],
        ),
        migrations.CreateModel(
            name='Exercise',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(default='Title', help_text='Title of the content item', max_length=50, verbose_name='title')),
                ('description', models.TextField(default='Description', help_text='Brief description of what this content item is', max_length=200, verbose_name='description')),
            ],
        ),
        migrations.CreateModel(
            name='Node',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='created')),
                ('modified', models.DateTimeField(auto_now=True, verbose_name='modified')),
                ('title', models.CharField(default='Title', help_text='Node title', max_length=50, verbose_name='title')),
                ('description', models.TextField(default='Description', help_text='Brief description of what is contained in this folder', max_length=200, verbose_name='description')),
                ('published', models.BooleanField(default=False, help_text='If published, students can access this item', verbose_name='Published')),
                ('deleted', models.BooleanField(default=False, help_text='Indicates that the node has been deleted, and should only be retrievable through the admin backend', verbose_name='Deleted')),
                ('sort_order', models.FloatField(default=0, help_text='Ascending, lowest number shown first', max_length=50, verbose_name='sort order')),
                ('license_owner', models.CharField(help_text='Organization of person who holds the essential rights', max_length=255, null=True, blank=True)),
                ('kind', models.CharField(default=b'Topic', help_text='Type of node (topic, video, exercise, etc.)', max_length=50, verbose_name='kind')),
                ('lft', models.PositiveIntegerField(editable=False, db_index=True)),
                ('rght', models.PositiveIntegerField(editable=False, db_index=True)),
                ('tree_id', models.PositiveIntegerField(editable=False, db_index=True)),
                ('level', models.PositiveIntegerField(editable=False, db_index=True)),
                ('license', models.ForeignKey(verbose_name='license', to='contentcuration.ContentLicense', help_text='License under which the work is distributed', null=True)),
                ('parent', mptt.fields.TreeForeignKey(related_name='children', blank=True, to='contentcuration.Node', null=True)),
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
                ('name', models.CharField(help_text='Displayed to the user', max_length=255, verbose_name='topic tree name')),
                ('is_published', models.BooleanField(default=False, help_text='If published, students can access this channel', verbose_name='Published')),
                ('channel', models.ForeignKey(verbose_name='channel', to='contentcuration.Channel', help_text='For different versions of the tree in the same channel (trash, edit, workspace)', null=True)),
                ('root_node', models.ForeignKey(verbose_name='root node', to='contentcuration.Node', help_text='The starting point for the tree, the title of it is the title shown in the menu', null=True)),
            ],
            options={
                'verbose_name': 'Topic tree',
                'verbose_name_plural': 'Topic trees',
            },
        ),
        migrations.AddField(
            model_name='assessmentitem',
            name='exercise',
            field=models.ForeignKey(related_name='all_assessment_items', to='contentcuration.Exercise'),
        ),
        migrations.AlterUniqueTogether(
            name='node',
            unique_together=set([('parent', 'title')]),
        ),
    ]
