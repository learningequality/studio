# -*- coding: utf-8 -*-
# Generated by Django 1.11.29 on 2021-03-05 20:28
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0120_auto_20210128_1646'),
    ]

    operations = [
        migrations.AddField(
            model_name='file',
            name='modified',
            field=models.DateTimeField(verbose_name='modified', null=True),
        ),
    ]
