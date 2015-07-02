# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0003_auto_20150630_1703'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='channel',
            name='level',
        ),
        migrations.RemoveField(
            model_name='channel',
            name='lft',
        ),
        migrations.RemoveField(
            model_name='channel',
            name='rght',
        ),
        migrations.RemoveField(
            model_name='channel',
            name='tree_id',
        ),
    ]
