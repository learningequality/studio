# -*- coding: utf-8 -*-
# Generated by Django 1.11.29 on 2021-04-07 00:57
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0122_file_modified_index'),
    ]

    operations = [
        migrations.AlterField(
            model_name='file',
            name='modified',
            field=models.DateTimeField(auto_now=True, null=True, verbose_name='modified'),
        ),
    ]
