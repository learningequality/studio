from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management import call_command
from django.core.management.base import BaseCommand
from le_utils.constants import content_kinds,file_formats, format_presets, licenses, exercises, languages
from contentcuration import models
import logging as logmodule
from django.core.cache import cache
logging = logmodule.getLogger(__name__)

SITES = [
    {
        "model" : Site,
        "pk" : "id",
        "fields": {
            "id": 1,
            "name"  : "Kolibri Studio",
            "domain" : "contentworkshop.learningequality.org",
        },
    },
    {
        "model" : Site,
        "pk" : "id",
        "fields": {
            "id": 2,
            "name"  : "Kolibri Studio (Debug Mode)",
            "domain" : "127.0.0.1:8000",
        },
    },
    {
        "model" : Site,
        "pk" : "id",
        "fields": {
            "id": 3,
            "name"  : "Kolibri Studio (Develop)",
            "domain" : "develop.contentworkshop.learningequality.org",
        },
    },
]

LICENSES = [
    {
        "model": models.License,
        "pk": "id",
        "fields": {
            "id": 1,
            "license_name": licenses.CC_BY,
            "exists": True,
            "license_url": "https://creativecommons.org/licenses/by/4.0/",
            "license_description": "The Attribution License lets others distribute, remix, tweak, and build upon your work, even commercially, as long as they credit you for the original creation. This is the most accommodating of licenses offered. Recommended for maximum dissemination and use of licensed materials.",
        },
    },
    {
        "model": models.License,
        "pk": "id",
        "fields": {
            "id": 2,
            "license_name": licenses.CC_BY_SA,
            "exists": True,
            "license_url": "https://creativecommons.org/licenses/by-sa/4.0",
            "license_description": "The Attribution-ShareAlike License lets others remix, tweak, and build upon your work even for commercial purposes, as long as they credit you and license their new creations under the identical terms. This license is often compared to \"copyleft\" free and open source software licenses. All new works based on yours will carry the same license, so any derivatives will also allow commercial use. This is the license used by Wikipedia, and is recommended for materials that would benefit from incorporating content from Wikipedia and similarly licensed projects.",
        },
    },
    {
        "model": models.License,
        "pk": "id",
        "fields": {
            "id": 3,
            "license_name": licenses.CC_BY_ND,
            "exists": True,
            "license_url": "https://creativecommons.org/licenses/by-nd/4.0/",
            "license_description": "The Attribution-NoDerivs License allows for redistribution, commercial and non-commercial, as long as it is passed along unchanged and in whole, with credit to you.",
        },
    },
    {
        "model": models.License,
        "pk": "id",
        "fields": {
            "id": 4,
            "license_name": licenses.CC_BY_NC,
            "exists": True,
            "license_url": "https://creativecommons.org/licenses/by-nc/4.0",
            "license_description": "The Attribution-NonCommercial License lets others remix, tweak, and build upon your work non-commercially, and although their new works must also acknowledge you and be non-commercial, they don't have to license their derivative works on the same terms.",
        },
    },
    {
        "model": models.License,
        "pk": "id",
        "fields": {
            "id": 5,
            "license_name": licenses.CC_BY_NC_SA,
            "exists": True,
            "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0",
            "license_description": "The Attribution-NonCommercial-ShareAlike License lets others remix, tweak, and build upon your work non-commercially, as long as they credit you and license their new creations under the identical terms.",
        },
    },
    {
        "model": models.License,
        "pk": "id",
        "fields": {
            "id": 6,
            "license_name": licenses.CC_BY_NC_ND,
            "exists": True,
            "license_url": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
            "license_description": "The Attribution-NonCommercial-NoDerivs License is the most restrictive of our six main licenses, only allowing others to download your works and share them with others as long as they credit you, but they can't change them in any way or use them commercially.",
        },
    },
    {
        "model": models.License,
        "pk": "id",
        "fields": {
            "id": 7,
            "license_name": licenses.ALL_RIGHTS_RESERVED,
            "exists": True,
            "license_url": "http://www.allrights-reserved.com/",
            "license_description": "The All Rights Reserved License indicates that the copyright holder reserves, or holds for their own use, all the rights provided by copyright law under one specific copyright treaty.",
        },
    },
    {
        "model": models.License,
        "pk": "id",
        "fields": {
            "id": 8,
            "license_name": licenses.PUBLIC_DOMAIN,
            "exists": True,
            "license_url": "https://creativecommons.org/publicdomain/mark/1.0/",
            "license_description": "Public Domain work has been identified as being free of known restrictions under copyright law, including all related and neighboring rights.",
        },
    },
]

FILE_FORMATS = [
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.MP4,
            "mimetype" : file_formats.MP4_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.VTT,
            "mimetype" : ".vtt",
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.SRT,
            "mimetype" : file_formats.SRT_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.PDF,
            "mimetype" : file_formats.PDF_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.MP3,
            "mimetype" : file_formats.MP3_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.JPG,
            "mimetype" : file_formats.JPG_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.JPEG,
            "mimetype" : file_formats.JPG_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.PNG,
            "mimetype" : file_formats.PNG_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.GIF,
            "mimetype" : file_formats.GIF_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.PERSEUS,
            "mimetype" : file_formats.PERSEUS_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.SVG,
            "mimetype" : file_formats.SVG_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.JSON,
            "mimetype" : file_formats.JSON_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.GRAPHIE,
            "mimetype" : file_formats.GRAPHIE_MIMETYPE,
        },
    },
    {
        "model": models.FileFormat,
        "pk": "extension",
        "fields": {
            "extension": file_formats.HTML5,
            "mimetype" : file_formats.HTML5_MIMETYPE,
        },
    },
]

KINDS = [
    {
        "model": models.ContentKind,
        "pk": "kind",
        "fields": {
            "kind": content_kinds.TOPIC,
        },
    },
    {
        "model": models.ContentKind,
        "pk": "kind",
        "fields": {
            "kind": content_kinds.VIDEO,
        }
    },
    {
        "model": models.ContentKind,
        "pk": "kind",
        "fields": {
            "kind": content_kinds.AUDIO,
        },
    },
    {
        "model": models.ContentKind,
        "pk": "kind",
        "fields": {
            "kind": content_kinds.EXERCISE,
        },
    },
    {
        "model": models.ContentKind,
        "pk": "kind",
        "fields": {
            "kind": content_kinds.DOCUMENT,
        },
    },
    {
        "model": models.ContentKind,
        "pk": "kind",
        "fields": {
            "kind": content_kinds.HTML5,
        },
    },
]

PRESETS = [
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.VIDEO_HIGH_RES,
            "readable_name" : format_presets.VIDEO_HIGH_RES_READABLE,
            "multi_language" : False,
            "supplementary" : False,
            "thumbnail" : False,
            "subtitle": False,
            "display": True,
            "order" : 1,
            "kind_id" : content_kinds.VIDEO,
            "allowed_formats" : [file_formats.MP4],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.VIDEO_LOW_RES,
            "readable_name": format_presets.VIDEO_LOW_RES_READABLE,
            "multi_language" : False,
            "supplementary" : False,
            "thumbnail" : False,
            "subtitle": False,
            "display": True,
            "order" : 2,
            "kind_id" : content_kinds.VIDEO,
            "allowed_formats" : [file_formats.MP4],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.VIDEO_THUMBNAIL,
            "readable_name": format_presets.VIDEO_THUMBNAIL_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : True,
            "subtitle": False,
            "display": True,
            "order" : 3,
            "kind_id" : content_kinds.VIDEO,
            "allowed_formats" : [file_formats.PNG, file_formats.JPG, file_formats.JPEG],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.VIDEO_SUBTITLE,
            "readable_name": format_presets.VIDEO_SUBTITLE_READABLE,
            "multi_language" : True,
            "supplementary" : True,
            "thumbnail" : False,
            "subtitle": True,
            "display": True,
            "order" : 4,
            "kind_id" : content_kinds.VIDEO,
            "allowed_formats" : [file_formats.VTT],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.AUDIO,
            "readable_name": format_presets.AUDIO_READABLE,
            "multi_language" : False,
            "supplementary" : False,
            "thumbnail" : False,
            "subtitle": False,
            "display": True,
            "order" : 1,
            "kind_id" : content_kinds.AUDIO,
            "allowed_formats" : [file_formats.MP3],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.AUDIO_THUMBNAIL,
            "readable_name": format_presets.AUDIO_THUMBNAIL_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : True,
            "subtitle": False,
            "display": True,
            "order" : 2,
            "kind_id" : content_kinds.AUDIO,
            "allowed_formats" : [file_formats.PNG, file_formats.JPG, file_formats.JPEG],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.DOCUMENT,
            "readable_name": format_presets.DOCUMENT_READABLE,
            "multi_language" : False,
            "supplementary" : False,
            "thumbnail" : False,
            "subtitle": False,
            "display": True,
            "order" : 1,
            "kind_id" : content_kinds.DOCUMENT,
            "allowed_formats" : [file_formats.PDF],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.DOCUMENT_THUMBNAIL,
            "readable_name": format_presets.DOCUMENT_THUMBNAIL_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : True,
            "subtitle": False,
            "display": True,
            "order" : 2,
            "kind_id" : content_kinds.DOCUMENT,
            "allowed_formats" : [file_formats.PNG, file_formats.JPG, file_formats.JPEG]
        }
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.EXERCISE,
            "readable_name": format_presets.EXERCISE_READABLE,
            "multi_language" : False,
            "supplementary" : False,
            "thumbnail" : False,
            "subtitle": False,
            "display": False,
            "order" : 1,
            "kind_id" : content_kinds.EXERCISE,
            "allowed_formats" : [file_formats.PERSEUS],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.EXERCISE_THUMBNAIL,
            "readable_name": format_presets.EXERCISE_THUMBNAIL_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : True,
            "subtitle": False,
            "display": True,
            "order" : 2,
            "kind_id" : content_kinds.EXERCISE,
            "allowed_formats" : [file_formats.PNG, file_formats.JPG, file_formats.JPEG],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.EXERCISE_IMAGE,
            "readable_name": format_presets.EXERCISE_IMAGE_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : False,
            "subtitle": False,
            "display": False,
            "order" : 3,
            "kind_id" : content_kinds.EXERCISE,
            "allowed_formats" : [file_formats.PNG, file_formats.JPG, file_formats.JPEG, file_formats.GIF, file_formats.SVG],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.EXERCISE_GRAPHIE,
            "readable_name": format_presets.EXERCISE_GRAPHIE_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : False,
            "subtitle": False,
            "display": False,
            "order" : 4,
            "kind_id" : content_kinds.EXERCISE,
            "allowed_formats" : [file_formats.SVG, file_formats.JSON],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.CHANNEL_THUMBNAIL,
            "readable_name": format_presets.CHANNEL_THUMBNAIL_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : True,
            "subtitle": False,
            "display": True,
            "order" : 0,
            "kind_id" : None,
            "allowed_formats" : [file_formats.PNG, file_formats.JPG, file_formats.JPEG],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.TOPIC_THUMBNAIL,
            "readable_name": format_presets.TOPIC_THUMBNAIL_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : True,
            "display": True,
            "order" : 1,
            "kind_id" : content_kinds.TOPIC,
            "allowed_formats" : [file_formats.PNG, file_formats.JPG, file_formats.JPEG],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.HTML5_ZIP,
            "readable_name": format_presets.HTML5_ZIP_READABLE,
            "multi_language" : False,
            "supplementary" : False,
            "thumbnail" : False,
            "subtitle": False,
            "display": True,
            "order" : 0,
            "kind_id" : content_kinds.HTML5,
            "allowed_formats" : [file_formats.HTML5],
        },
    },
    {
        "model": models.FormatPreset,
        "pk": "id",
        "fields": {
            "id" : format_presets.HTML5_THUMBNAIL,
            "readable_name": format_presets.HTML5_THUMBNAIL_READABLE,
            "multi_language" : False,
            "supplementary" : True,
            "thumbnail" : True,
            "subtitle": False,
            "display": True,
            "order" : 1,
            "kind_id" : content_kinds.HTML5,
            "allowed_formats" : [file_formats.PNG, file_formats.JPG, file_formats.JPEG],
        },
    },
]

LANGUAGES = [{
    "model": models.Language,
    "pk": "id",
    "fields": {
            "id": l.code,
            "lang_code": l.primary_code,
            "lang_subcode": l.subcode,
            "readable_name": l.name,
            "native_name" : l.native_name,
        },
} for l in languages.LANGUAGELIST ]

CONSTANTS = [SITES, LICENSES, FILE_FORMATS, KINDS, PRESETS, LANGUAGES]

class EarlyExit(BaseException):
    def __init__(self, message, db_path):
        self.message = message
        self.db_path = db_path


class Command(BaseCommand):
    def add_arguments(self, parser):
        pass

    def handle(self, *args, **options):
        try:
            self.stdout.write("***** Loading Constants *****")
            for constant_list in CONSTANTS:
                current_model = ""
                new_model_count = 0
                for constant in constant_list:
                    current_model=constant['model'].__name__
                    if cache.has_key(current_model):
                        cache.delete(current_model)
                    obj, isNew = constant['model'].objects.update_or_create(**{constant['pk'] : constant['fields'][constant['pk']]})
                    new_model_count += 1 if isNew else 0
                    for attr, value in constant['fields'].items():
                        setattr(obj, attr, value)

                    obj.save()
                self.stdout.write("{0}: {1} constants saved ({2} new)".format(str(current_model), len(constant_list), new_model_count))
            self.stdout.write("************ DONE. ************")

        except EarlyExit as e:
            logging.warning("Exited early due to {message}.".format(
                message=e.message))
            self.stdout.write("You can find your database in {path}".format(
                path=e.db_path))
