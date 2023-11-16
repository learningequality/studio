"""
All task functions decorated with `app.task` transform the function to an instance of
`contentcuration.utils.celery.tasks.CeleryTask`. See the methods of that class for enqueuing and fetching results of
the tasks.
"""
from __future__ import absolute_import
from __future__ import unicode_literals

import logging
import time

from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils.translation import override

from contentcuration.celery import app
from contentcuration.models import Change
from contentcuration.models import ContentNode
from contentcuration.models import User
from contentcuration.utils.csv_writer import write_user_csv
from contentcuration.utils.nodes import calculate_resource_size
from contentcuration.utils.nodes import generate_diff
from contentcuration.viewsets.user import AdminUserFilter


logger = get_task_logger(__name__)


@app.task(bind=True, name="apply_user_changes")
def apply_user_changes_task(self, user_id):
    """
    :type self: contentcuration.utils.celery.tasks.CeleryTask
    :param user_id: The user ID for which to process changes
    """
    from contentcuration.viewsets.sync.base import apply_changes
    changes_qs = Change.objects.filter(applied=False, errored=False, user_id=user_id, channel__isnull=True)
    apply_changes(changes_qs)
    if changes_qs.exists():
        self.requeue()


@app.task(bind=True, name="apply_channel_changes")
def apply_channel_changes_task(self, channel_id):
    """
    :type self: contentcuration.utils.celery.tasks.CeleryTask
    :param channel_id: The channel ID for which to process changes
    """
    from contentcuration.viewsets.sync.base import apply_changes
    changes_qs = Change.objects.filter(applied=False, errored=False, channel_id=channel_id)
    apply_changes(changes_qs)
    if changes_qs.exists():
        self.requeue()


class CustomEmailMessage(EmailMessage):
    """
        jayoshih: There's an issue with the django postmark backend where
        _build_message attempts to attach files as base64. However,
        the django EmailMessage attach method makes all content with a text/*
        mimetype to be encoded as a string, causing `base64.b64encode(content)`
        to fail. This is a workaround to ensure that content is still encoded as
        bytes when it comes to encoding the attachment as base64
    """
    def attach(self, filename=None, content=None, mimetype=None):
        if filename is None:
            raise AssertionError
        if content is None:
            raise AssertionError
        if mimetype is None:
            raise AssertionError
        self.attachments.append((filename, content, mimetype))


@app.task(name="generateusercsv_task")
def generateusercsv_task(user_id, language=settings.LANGUAGE_CODE):
    with override(language):
        user = User.objects.get(pk=user_id)
        csv_path = write_user_csv(user)
        subject = render_to_string("export/user_csv_email_subject.txt", {})
        message = render_to_string(
            "export/user_csv_email.txt",
            {
                "legal_email": settings.POLICY_EMAIL,
                "user": user,
                "edit_channels": user.editable_channels.values("name", "id"),
                "view_channels": user.view_only_channels.values("name", "id"),
            },
        )

        email = CustomEmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
        email.encoding = 'utf-8'
        email.attach_file(csv_path, mimetype="text/csv")

        email.send()


@app.task(name="deletetree_task")
def deletetree_task(tree_id):
    ContentNode.objects.filter(tree_id=tree_id).delete()


@app.task(name="getnodedetails_task")
def getnodedetails_task(node_id):
    node = ContentNode.objects.get(pk=node_id)
    return node.get_details()


@app.task(name="generatenodediff_task")
def generatenodediff_task(updated_id, original_id):
    return generate_diff(updated_id, original_id)


@app.task(name="calculate_user_storage_task")
def calculate_user_storage_task(user_id):
    try:
        user = User.objects.get(pk=user_id)
        user.set_space_used()
    except User.DoesNotExist:
        logging.error("Tried to calculate user storage for user with id {} but they do not exist".format(user_id))


@app.task(name="calculate_resource_size_task")
def calculate_resource_size_task(node_id, channel_id):
    node = ContentNode.objects.get(pk=node_id)
    size, _ = calculate_resource_size(node=node, force=True)
    return size


@app.task(name="sendcustomemails_task")
def sendcustomemails_task(subject, message, query):
    subject = render_to_string('registration/custom_email_subject.txt', {'subject': subject})
    recipients = AdminUserFilter(data=query).qs.distinct()

    for recipient in recipients:
        text = message.format(current_date=time.strftime("%A, %B %d"), current_time=time.strftime("%H:%M %Z"), **recipient.__dict__)
        text = render_to_string('registration/custom_email.txt', {'message': text})
        recipient.email_user(subject, text, settings.DEFAULT_FROM_EMAIL, )

@app.task(name="generatecaptioncues_task")
def generatecaptioncues_task(caption_file_id: str, channel_id, user_id) -> None:
    """Start generating the Captions Cues for requested the Caption File"""

    from contentcuration.viewsets.caption import CaptionCueSerializer
    from contentcuration.viewsets.sync.constants import CAPTION_FILE
    from contentcuration.viewsets.sync.constants import CAPTION_CUES
    from contentcuration.viewsets.sync.utils import generate_update_event
    from contentcuration.viewsets.sync.utils import generate_create_event
    from contentcuration.utils.transcription import WhisperAdapter
    from contentcuration.utils.transcription import WhisperBackendFactory


    backend = WhisperBackendFactory().create_backend()
    adapter = WhisperAdapter(backend=backend)

    cues = adapter.transcribe(caption_file_id=caption_file_id).get_cues(caption_file_id)

    for cue in cues:
        serializer = CaptionCueSerializer(data=cue)
        if serializer.is_valid():
            serializer.save()
            Change.create_change(generate_create_event(
                    cue["id"],
                    CAPTION_CUES,
                    {
                        "id": cue["id"],
                        "text": cue["text"],
                        "starttime": cue["starttime"],
                        "endtime": cue["endtime"],
                        "caption_file_id": cue["caption_file_id"],
                    },
                    channel_id=channel_id,
            ), applied=True, created_by_id=user_id)
        else:
            raise ValueError(f"Error in cue serialization: {serializer.errors}")

    Change.create_change(generate_update_event(
        caption_file_id,
        CAPTION_FILE,
        {"__generating_captions": False},
        channel_id=channel_id,
    ), applied=True, created_by_id=user_id)
