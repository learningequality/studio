# -*- coding: utf-8 -*-
# Generated by Django 1.11.20 on 2019-10-28 23:25
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0103_auto_20190905_0408'),
    ]

    operations = [
        migrations.AlterField(
            model_name='formatpreset',
            name='id',
            field=models.CharField(choices=[('high_res_video', 'High Resolution'), ('low_res_video', 'Low Resolution'), ('video_thumbnail', 'Thumbnail'), ('video_subtitle', 'Subtitle'), ('video_dependency', 'Video (dependency)'), ('audio', 'Audio'), ('audio_thumbnail', 'Thumbnail'), ('document', 'Document'), ('epub', 'ePub Document'), ('document_thumbnail', 'Thumbnail'), ('exercise', 'Exercise'), ('exercise_thumbnail', 'Thumbnail'), ('exercise_image', 'Exercise Image'), ('exercise_graphie', 'Exercise Graphie'), ('channel_thumbnail', 'Channel Thumbnail'), ('topic_thumbnail', 'Thumbnail'), ('html5_zip', 'HTML5 Zip'), ('html5_dependency', 'HTML5 Dependency (Zip format)'), ('html5_thumbnail', 'HTML5 Thumbnail'), ('h5p', 'H5P Zip'), ('slideshow_image', 'Slideshow Image'), ('slideshow_thumbnail', 'Slideshow Thumbnail'), ('slideshow_manifest', 'Slideshow Manifest')], max_length=150, primary_key=True, serialize=False),
        ),
    ]
