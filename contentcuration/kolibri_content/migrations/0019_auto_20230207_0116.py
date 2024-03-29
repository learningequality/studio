# Generated by Django 3.2.14 on 2023-02-07 01:16
import django.db.models.deletion
import kolibri_content.fields
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0018_auto_20220224_2031'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='contentnode',
            options={},
        ),
        migrations.AlterModelOptions(
            name='file',
            options={},
        ),
        migrations.AlterField(
            model_name='assessmentmetadata',
            name='assessment_item_ids',
            field=kolibri_content.fields.JSONField(default=[]),
        ),
        migrations.AlterField(
            model_name='assessmentmetadata',
            name='mastery_model',
            field=kolibri_content.fields.JSONField(default={}),
        ),
        migrations.AlterField(
            model_name='contentnode',
            name='coach_content',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='contentnode',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='contentnode',
            name='duration',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='contentnode',
            name='lang',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='content.language'),
        ),
        migrations.AlterField(
            model_name='contentnode',
            name='license_description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='contentnode',
            name='options',
            field=kolibri_content.fields.JSONField(blank=True, default={}, null=True),
        ),
        migrations.AlterField(
            model_name='file',
            name='lang',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='content.language'),
        ),
        migrations.AlterIndexTogether(
            name='contentnode',
            index_together=set(),
        ),
    ]
