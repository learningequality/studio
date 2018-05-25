import csv
import datetime
import json
import os
import platform
import progressbar
import re
import sys
import time
reload(sys)
sys.setdefaultencoding('UTF8')

from django.conf import settings
from django.contrib.sites.models import Site
from contentcuration.models import Channel, generate_storage_url
from le_utils.constants import content_kinds, exercises
from django.db.models import Sum
from django.template.loader import render_to_string
from django.utils.translation import ugettext as _

from time import sleep

if not os.path.exists(settings.CSV_ROOT):
    os.makedirs(settings.CSV_ROOT)

def write_channel_csv_file(channel, force=False, site=None, show_progress=False):
    csv_path = _generate_csv_filename(channel)

    if force or not _csv_file_exists(csv_path, channel):
        with open(csv_path, 'wb') as csvfile:
            writer = csv.writer(csvfile, delimiter=',', quoting=csv.QUOTE_MINIMAL)
            site = site or Site.objects.get(pk=1).domain
            writer.writerow(['Path', 'Title', 'Kind', 'Description', 'URL', 'Author', 'Language', 'License', 'License Description', 'Copyright Holder', 'File Size', 'Tags', 'Questions (if exercise)'])

            nodes = channel.main_tree.get_descendants()\
                            .exclude(kind_id=content_kinds.TOPIC)\
                            .select_related('license', 'language', 'parent')\
                            .prefetch_related('files', 'assessment_items', 'tags')
            if show_progress:
                bar = progressbar.ProgressBar(max_value=nodes.count())

            index = 0
            for node in nodes:
                _write_content_csv(writer, node, site)
                if show_progress:
                    index += 1
                    bar.update(index)
                    sleep(0.01)

    return csv_path

def _csv_file_exists(csv_path, channel):
    last_modified = time.mktime(channel.main_tree.modified.timetuple())
    return os.path.isfile(csv_path) and _creation_date(csv_path) >= last_modified

def _write_content_csv(writer, node, site):
    path = "/".join(node.get_ancestors().order_by("level").values_list("title", flat=True))
    url = "/".join([site, "channels", node.get_channel().pk, "view", node.parent.node_id[:7], node.node_id[:7]])
    language = node.language.readable_name if node.language else "Default to topic language"
    license = node.license.license_name if node.license else "No license"
    file_size = _format_size(node.files.values('checksum', 'file_size')\
                          .distinct()\
                          .aggregate(size=Sum('file_size'))['size'] or 0)
    tags = ", ".join(node.tags.values_list('tag_name', flat=True))
    questions = ""
    if node.kind_id == content_kinds.EXERCISE:
        questions = " ".join([_format_question(q) for q in node.assessment_items.all().order_by("order")])
    return writer.writerow([path, node.title, node.kind_id.capitalize(), node.description, url, node.author, language, license, node.license_description, node.copyright_holder, file_size, tags, questions])

# Formatting helpers
def _generate_csv_filename(channel):
    filename = re.sub(r'([^\s\w]|_)+', '', channel.name)
    return os.path.join(settings.CSV_ROOT, "{}- {}.csv".format(channel.pk[:7], filename))

def _format_size(num, suffix='B'):
    """ Format sizes """
    for unit in ['','K','M','G','T','P','E','Z']:
        if abs(num) < 1024.0:
            return "%3.1f%s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f%s%s" % (num, 'Yi', suffix)

def _format_question(question):
    if question.type == exercises.PERSEUS_QUESTION:
        try:
            text = re.sub(r"\[\[.*\]\]", "", json.loads(question.raw_data)['question']['content']).encode('utf-8')
        except Exception: # Some perseus json is malformed
            text = ""
    else:
        text = question.question
    text = re.sub(r"!\[[^\[]*\]\([^\)]*\)", "{Image}", text)
    return "[{}] {}".format(question.type.replace("_", " ").upper(), text.replace("\n", " ").replace("\\_", "_"))



def _creation_date(path_to_file):
    if platform.system() == 'Windows':
        return os.path.getctime(path_to_file)
    else:
        stat = os.stat(path_to_file)
        try:
            return stat.st_birthtime
        except AttributeError:
            return stat.st_mtime

# Formatting helpers
def generate_user_csv_filename(user):
    directory = os.path.join(settings.CSV_ROOT, "users")
    if not os.path.exists(directory):
        os.makedirs(directory)
    email = re.sub(r'([^\s\w]|_)+', '', user.email.split('.')[0])
    return os.path.join(directory, "{}{}- {} {} Data.csv".format(email, user.id, user.first_name, user.last_name))

def _write_user_row(file, writer, domain):
    if file.contentnode:
        channel = file.contentnode.get_channel()
        channel_name = channel.name if channel else _("No Channel")
        title = file.contentnode.title
        language = file.language.readable_name if file.language else file.contentnode.language.readable_name if file.contentnode.language else ""
        license = file.contentnode.license.license_name if file.contentnode.license else "No license"
        kind = next((k[1] for k in content_kinds.choices if k[0] == file.contentnode.kind_id), None)
        description = file.contentnode.description
        author = file.contentnode.author
        license_description = file.contentnode.license_description
        copyright_holder = file.contentnode.copyright_holder

    else:
        title = _("No resource")
        channel_name =  _("No Channel")
        kind = description = author = license = license_description = copyright_holder = ""
        language = file.language.readable_name if file.language else ""

    file_size = _format_size(file.file_size)
    url = "https://{}{}".format(domain, generate_storage_url(str(file)))

    writer.writerow([channel_name, title, kind, file.original_filename, file_size, url, description, author, language, license, license_description, copyright_holder])

def write_user_csv(user):
    csv_path = generate_user_csv_filename(user)

    with open(csv_path, 'wb') as csvfile:
        writer = csv.writer(csvfile, delimiter=',', quoting=csv.QUOTE_MINIMAL)

        writer.writerow([_('Channel'), _('Title'), _('Kind'), _('Filename'), _('File Size'), _('URL'), _('Description'), _('Author'), _('Language'), _('License'), _('License Description'), _('Copyright Holder')])

        domain = Site.objects.get(pk=1).domain

        # Get all user files
        for file in user.files.select_related('contentnode', 'language').all():
            _write_user_row(file, writer, domain)

        for file in user.staged_files.all():
            file_size = _format_size(file.file_size)
            writer.writerow([_("No Channel"), _("No Resource"), "", _("Staged File"), file_size, "", "", "", "", "", "", ""])

    return csv_path
