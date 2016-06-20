# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import mptt.fields
import django.db.models.deletion
from django.conf import settings
import contentcuration.models
import uuid


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
                ('id', contentcuration.models.UUIDField(default=uuid.uuid4, max_length=32, serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=200)),
                ('description', models.CharField(max_length=400, blank=True)),
                ('version', models.IntegerField(default=0)),
                ('thumbnail', models.TextField(blank=True)),
                ('deleted', models.BooleanField(default=False)),
                ('bookmarked_by', models.ManyToManyField(related_name='bookmarked_channels', verbose_name='bookmarked by', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Channel',
                'verbose_name_plural': 'Channels',
            },
        ),
        migrations.CreateModel(
            name='ContentKind',
            fields=[
                ('kind', models.CharField(max_length=200, serialize=False, primary_key=True, choices=[(b'topic', 'Topic'), (b'video', 'Video'), (b'audio', 'Audio'), (b'exercise', 'Exercise'), (b'document', 'Document'), (b'image', 'Image')])),
            ],
        ),
        migrations.CreateModel(
            name='ContentNode',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('content_id', contentcuration.models.UUIDField(default=uuid.uuid4, max_length=32, editable=False)),
                ('title', models.CharField(max_length=200)),
                ('description', models.CharField(max_length=400, blank=True)),
                ('sort_order', models.FloatField(default=0, help_text='Ascending, lowest number shown first', max_length=50, verbose_name='sort order')),
                ('license_owner', models.CharField(help_text='Organization of person who holds the essential rights', max_length=200, blank=True)),
                ('author', models.CharField(help_text='Person who created content', max_length=200, blank=True)),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='created')),
                ('modified', models.DateTimeField(auto_now=True, verbose_name='modified')),
                ('changed', models.BooleanField(default=True)),
                ('lft', models.PositiveIntegerField(editable=False, db_index=True)),
                ('rght', models.PositiveIntegerField(editable=False, db_index=True)),
                ('tree_id', models.PositiveIntegerField(editable=False, db_index=True)),
                ('level', models.PositiveIntegerField(editable=False, db_index=True)),
                ('cloned_source', mptt.fields.TreeForeignKey(related_name='clones', on_delete=django.db.models.deletion.SET_NULL, blank=True, to='contentcuration.ContentNode', null=True)),
            ],
            options={
                'verbose_name': 'Topic',
                'verbose_name_plural': 'Topics',
            },
        ),
        migrations.CreateModel(
            name='ContentTag',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('tag_name', models.CharField(max_length=30)),
                ('channel', models.ForeignKey(related_name='tags', blank=True, to='contentcuration.Channel', null=True)),
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
            name='File',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('checksum', models.CharField(max_length=400, blank=True)),
                ('file_size', models.IntegerField(null=True, blank=True)),
                ('file_on_disk', models.FileField(storage=contentcuration.models.FileOnDiskStorage(), max_length=500, upload_to=contentcuration.models.file_on_disk_name, blank=True)),
                ('original_filename', models.CharField(max_length=255, blank=True)),
                ('contentnode', models.ForeignKey(related_name='files', blank=True, to='contentcuration.ContentNode', null=True)),
            ],
        ),
        migrations.CreateModel(
            name='FileFormat',
            fields=[
                ('extension', models.CharField(max_length=40, serialize=False, primary_key=True, choices=[(b'mp4', 'mp4'), (b'vtt', 'vtt'), (b'srt', 'srt'), (b'mp3', 'mp3'), (b'pdf', 'pdf')])),
                ('mimetype', models.CharField(max_length=200, blank=True)),
            ],
        ),
        migrations.CreateModel(
            name='FormatPreset',
            fields=[
                ('id', models.CharField(max_length=150, serialize=False, primary_key=True, choices=[(b'high_res_video', 'High resolution video'), (b'low_res_video', 'Low resolution video'), (b'vector_video', 'Vertor video'), (b'thumbnail', 'Thumbnail'), (b'thumbnail', 'Thumbnail'), (b'caption', 'Caption')])),
                ('readable_name', models.CharField(max_length=400)),
                ('multi_language', models.BooleanField(default=False)),
                ('supplementary', models.BooleanField(default=False)),
                ('order', models.IntegerField()),
                ('allowed_formats', models.ManyToManyField(to='contentcuration.FileFormat', blank=True)),
                ('kind', models.ForeignKey(related_name='format_presets', to='contentcuration.ContentKind')),
            ],
        ),
        migrations.CreateModel(
            name='Language',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('lang_code', models.CharField(max_length=2, db_index=True)),
                ('lang_subcode', models.CharField(max_length=2, db_index=True)),
            ],
        ),
        migrations.CreateModel(
            name='License',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('license_name', models.CharField(max_length=50)),
                ('license_url', models.URLField(blank=True)),
                ('license_description', models.TextField(blank=True)),
                ('exists', models.BooleanField(default=False, help_text='Tells whether or not a content item is licensed to share', verbose_name='license exists')),
            ],
        ),
        migrations.CreateModel(
            name='PrerequisiteContentRelationship',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('prerequisite', models.ForeignKey(related_name='contentcuration_prerequisitecontentrelationship_prerequisite', to='contentcuration.ContentNode')),
                ('target_node', models.ForeignKey(related_name='contentcuration_prerequisitecontentrelationship_target_node', to='contentcuration.ContentNode')),
            ],
        ),
        migrations.CreateModel(
            name='RelatedContentRelationship',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('contentnode_1', models.ForeignKey(related_name='contentcuration_relatedcontentrelationship_1', to='contentcuration.ContentNode')),
                ('contentnode_2', models.ForeignKey(related_name='contentcuration_relatedcontentrelationship_2', to='contentcuration.ContentNode')),
            ],
        ),
        migrations.AddField(
            model_name='file',
            name='file_format',
            field=models.ForeignKey(related_name='files', blank=True, to='contentcuration.FileFormat', null=True),
        ),
        migrations.AddField(
            model_name='file',
            name='lang',
            field=models.ForeignKey(blank=True, to='contentcuration.Language', null=True),
        ),
        migrations.AddField(
            model_name='file',
            name='preset',
            field=models.ForeignKey(related_name='files', blank=True, to='contentcuration.FormatPreset', null=True),
        ),
        migrations.AddField(
            model_name='contentnode',
            name='is_related',
            field=models.ManyToManyField(related_name='relate_to', through='contentcuration.RelatedContentRelationship', to='contentcuration.ContentNode', blank=True),
        ),
        migrations.AddField(
            model_name='contentnode',
            name='kind',
            field=models.ForeignKey(related_name='contentnodes', to='contentcuration.ContentKind'),
        ),
        migrations.AddField(
            model_name='contentnode',
            name='license',
            field=models.ForeignKey(to='contentcuration.License', null=True),
        ),
        migrations.AddField(
            model_name='contentnode',
            name='original_node',
            field=mptt.fields.TreeForeignKey(related_name='duplicates', on_delete=django.db.models.deletion.SET_NULL, blank=True, to='contentcuration.ContentNode', null=True),
        ),
        migrations.AddField(
            model_name='contentnode',
            name='parent',
            field=mptt.fields.TreeForeignKey(related_name='children', blank=True, to='contentcuration.ContentNode', null=True),
        ),
        migrations.AddField(
            model_name='contentnode',
            name='prerequisite',
            field=models.ManyToManyField(related_name='is_prerequisite_of', through='contentcuration.PrerequisiteContentRelationship', to='contentcuration.ContentNode', blank=True),
        ),
        migrations.AddField(
            model_name='contentnode',
            name='tags',
            field=models.ManyToManyField(related_name='tagged_content', to='contentcuration.ContentTag', blank=True),
        ),
        migrations.AddField(
            model_name='channel',
            name='clipboard_tree',
            field=models.ForeignKey(related_name='channel_clipboard', blank=True, to='contentcuration.ContentNode', null=True),
        ),
        migrations.AddField(
            model_name='channel',
            name='editors',
            field=models.ManyToManyField(help_text='Users with edit rights', related_name='editable_channels', verbose_name='editors', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='channel',
            name='main_tree',
            field=models.ForeignKey(related_name='channel_main', blank=True, to='contentcuration.ContentNode', null=True),
        ),
        migrations.AddField(
            model_name='channel',
            name='trash_tree',
            field=models.ForeignKey(related_name='channel_trash', blank=True, to='contentcuration.ContentNode', null=True),
        ),
        migrations.AddField(
            model_name='assessmentitem',
            name='exercise',
            field=models.ForeignKey(related_name='all_assessment_items', to='contentcuration.Exercise'),
        ),
        migrations.AlterUniqueTogether(
            name='relatedcontentrelationship',
            unique_together=set([('contentnode_1', 'contentnode_2')]),
        ),
        migrations.AlterUniqueTogether(
            name='prerequisitecontentrelationship',
            unique_together=set([('target_node', 'prerequisite')]),
        ),
        migrations.AlterUniqueTogether(
            name='contenttag',
            unique_together=set([('tag_name', 'channel')]),
        ),
    ]
