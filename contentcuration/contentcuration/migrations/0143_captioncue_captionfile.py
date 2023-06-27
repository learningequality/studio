# Generated by Django 3.2.14 on 2023-06-26 17:33

import contentcuration.models
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('contentcuration', '0142_add_task_signature'),
    ]

    operations = [
        migrations.CreateModel(
            name='CaptionFile',
            fields=[
                ('id', contentcuration.models.UUIDField(default=uuid.uuid4, max_length=32, primary_key=True, serialize=False)),
                ('file_id', contentcuration.models.UUIDField(default=uuid.uuid4, max_length=32)),
                ('language', models.CharField(choices=[('en', 'english'), ('zh', 'chinese'), ('de', 'german'), ('es', 'spanish'), ('ru', 'russian'), ('ko', 'korean'), ('fr', 'french'), ('ja', 'japanese'), ('pt', 'portuguese'), ('tr', 'turkish'), ('pl', 'polish'), ('ca', 'catalan'), ('nl', 'dutch'), ('ar', 'arabic'), ('sv', 'swedish'), ('it', 'italian'), ('id', 'indonesian'), ('hi', 'hindi'), ('fi', 'finnish'), ('vi', 'vietnamese'), ('he', 'hebrew'), ('uk', 'ukrainian'), ('el', 'greek'), ('ms', 'malay'), ('cs', 'czech'), ('ro', 'romanian'), ('da', 'danish'), ('hu', 'hungarian'), ('ta', 'tamil'), ('no', 'norwegian'), ('th', 'thai'), ('ur', 'urdu'), ('hr', 'croatian'), ('bg', 'bulgarian'), ('lt', 'lithuanian'), ('la', 'latin'), ('mi', 'maori'), ('ml', 'malayalam'), ('cy', 'welsh'), ('sk', 'slovak'), ('te', 'telugu'), ('fa', 'persian'), ('lv', 'latvian'), ('bn', 'bengali'), ('sr', 'serbian'), ('az', 'azerbaijani'), ('sl', 'slovenian'), ('kn', 'kannada'), ('et', 'estonian'), ('mk', 'macedonian'), ('br', 'breton'), ('eu', 'basque'), ('is', 'icelandic'), ('hy', 'armenian'), ('ne', 'nepali'), ('mn', 'mongolian'), ('bs', 'bosnian'), ('kk', 'kazakh'), ('sq', 'albanian'), ('sw', 'swahili'), ('gl', 'galician'), ('mr', 'marathi'), ('pa', 'punjabi'), ('si', 'sinhala'), ('km', 'khmer'), ('sn', 'shona'), ('yo', 'yoruba'), ('so', 'somali'), ('af', 'afrikaans'), ('oc', 'occitan'), ('ka', 'georgian'), ('be', 'belarusian'), ('tg', 'tajik'), ('sd', 'sindhi'), ('gu', 'gujarati'), ('am', 'amharic'), ('yi', 'yiddish'), ('lo', 'lao'), ('uz', 'uzbek'), ('fo', 'faroese'), ('ht', 'haitian creole'), ('ps', 'pashto'), ('tk', 'turkmen'), ('nn', 'nynorsk'), ('mt', 'maltese'), ('sa', 'sanskrit'), ('lb', 'luxembourgish'), ('my', 'myanmar'), ('bo', 'tibetan'), ('tl', 'tagalog'), ('mg', 'malagasy'), ('as', 'assamese'), ('tt', 'tatar'), ('haw', 'hawaiian'), ('ln', 'lingala'), ('ha', 'hausa'), ('ba', 'bashkir'), ('jw', 'javanese'), ('su', 'sundanese')], max_length=3)),
            ],
            options={
                'unique_together': {('file_id', 'language')},
            },
        ),
        migrations.CreateModel(
            name='CaptionCue',
            fields=[
                ('id', contentcuration.models.UUIDField(default=uuid.uuid4, max_length=32, primary_key=True, serialize=False)),
                ('text', models.TextField()),
                ('starttime', models.FloatField()),
                ('endtime', models.FloatField()),
                ('caption_file', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='caption_cue', to='contentcuration.captionfile')),
            ],
        ),
    ]
