# Generated by Django 3.2.14 on 2022-10-22 18:30
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0143_file_file_media_duration_int'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='deleted',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.CreateModel(
            name='UserHistory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('soft-deletion', 'User soft deletion'), ('soft-recovery',
                                                                                               'User soft deletion recovery'), ('related-data-hard-deletion', 'User related data hard deletion')], max_length=32)),
                ('performed_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='history', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
