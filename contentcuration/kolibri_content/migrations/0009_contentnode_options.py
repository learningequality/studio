# -*- coding: utf-8 -*-
# Generated by Django 1.11.20 on 2020-04-11 19:07
from __future__ import unicode_literals

import jsonfield.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0008_channelmetadata_tagline'),
    ]

    operations = [
        migrations.AddField(
            model_name='contentnode',
            name='options',
            field=jsonfield.fields.JSONField(default={}),
        ),
    ]
