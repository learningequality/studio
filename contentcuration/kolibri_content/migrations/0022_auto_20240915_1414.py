# Generated by Django 3.2.24 on 2024-09-15 14:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0021_auto_20240612_1847'),
    ]

    operations = [
        migrations.AlterField(
            model_name='file',
            name='extension',
            field=models.CharField(blank=True, choices=[('mp4', 'MP4 Video'), ('webm', 'WEBM Video'), ('vtt', 'VTT Subtitle'), ('mp3', 'MP3 Audio'), ('pdf', 'PDF Document'), ('jpg', 'JPG Image'), ('jpeg', 'JPEG Image'), ('png', 'PNG Image'), ('gif', 'GIF Image'), ('json', 'JSON'), ('svg', 'SVG Image'), ('perseus', 'Perseus Exercise'), ('graphie', 'Graphie Exercise'), ('zip', 'HTML5 Zip'), ('h5p', 'H5P'), ('zim', 'ZIM'), ('epub', 'ePub Document'), ('bloompub', 'Bloom Document'), ('bloomd', 'Bloom Document')], max_length=40),
        ),
        migrations.AlterField(
            model_name='localfile',
            name='extension',
            field=models.CharField(blank=True, choices=[('mp4', 'MP4 Video'), ('webm', 'WEBM Video'), ('vtt', 'VTT Subtitle'), ('mp3', 'MP3 Audio'), ('pdf', 'PDF Document'), ('jpg', 'JPG Image'), ('jpeg', 'JPEG Image'), ('png', 'PNG Image'), ('gif', 'GIF Image'), ('json', 'JSON'), ('svg', 'SVG Image'), ('perseus', 'Perseus Exercise'), ('graphie', 'Graphie Exercise'), ('zip', 'HTML5 Zip'), ('h5p', 'H5P'), ('zim', 'ZIM'), ('epub', 'ePub Document'), ('bloompub', 'Bloom Document'), ('bloomd', 'Bloom Document')], max_length=40),
        ),
    ]
