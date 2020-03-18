from django.conf import settings
from django.core.files.storage import default_storage
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

from contentcuration.models import Channel
from contentcuration.utils.export_writer import ChannelDetailsCSVWriter
from contentcuration.utils.export_writer import ChannelDetailsPDFWriter


def export_public_channel_info(user, export_type="pdf", site=None):
    filename = "Kolibri Studio content library.{}".format(export_type)
    channel_ids = Channel.objects.filter(public=True).order_by('name').values_list('pk', flat=True)
    if export_type == 'csv':
        filepath = ChannelDetailsCSVWriter(channel_ids, site=site, filename=filename).write()
        mimetype = "text/csv"
    else:
        filepath = ChannelDetailsPDFWriter(channel_ids, site=site, condensed=True, filename=filename).write()
        mimetype = "application/pdf"

    subject = "Your {} has finished generating".format(export_type)
    message = render_to_string('export/public_channels_email.txt', {'export_type': export_type, 'user': user})

    with default_storage.open(filepath) as fobj:
        email = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
        email.attach(filename, fobj.read(), mimetype)
        email.send()
