# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0001_squashed_0010_auto_20150717_1156'),
    ]

    operations = [
        migrations.AlterField(
            model_name='channel',
            name='author',
            field=models.CharField(help_text='Channel author can be a person or an organization', max_length=100, verbose_name='channel author'),
        ),
    ]
