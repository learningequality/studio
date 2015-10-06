# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0001_squashed_0010_auto_20150717_1156'),
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
            name='Exercise',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(default='Title', help_text='Title of the content item', max_length=50, verbose_name='title')),
                ('description', models.TextField(default='Description', help_text='Brief description of what this content item is', max_length=200, verbose_name='description')),
            ],
        ),
        migrations.AlterField(
            model_name='channel',
            name='author',
            field=models.CharField(help_text='Channel author can be a person or an organization', max_length=100, verbose_name='channel author'),
        ),
        migrations.AddField(
            model_name='assessmentitem',
            name='exercise',
            field=models.ForeignKey(related_name='all_assessment_items', to='contentcuration.Exercise'),
        ),
    ]
