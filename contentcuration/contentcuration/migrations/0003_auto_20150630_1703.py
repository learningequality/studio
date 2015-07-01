# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0002_auto_20150630_1700'),
    ]

    operations = [
        migrations.RenameField(
            model_name='channel',
            old_name='channel_name',
            new_name='name',
        ),
    ]
