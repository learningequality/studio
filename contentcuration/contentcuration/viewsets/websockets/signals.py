import logging as logger

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from contentcuration.models import Change
from contentcuration.utils.sentry import report_exception

logging = logger.getLogger(__name__)


class NoneCreatedByIdError(Exception):
    """
    Use to log change object whose created_by_id is set to none. We don't raise this error,
    just feed it to Sentry for reporting.
    """

    def __init__(self, instance):

        self.change_object = instance
        message = (
            "The change object did not have a created_by_id {}"
        )
        self.message = message.format(
            instance.pk
        )

        super(NoneCreatedByIdError, self).__init__(self.message)


@receiver(post_save, sender=Change, weak=False)
def broadcast_new_change_model_handler(sender, instance, created, **kwargs):
    broadcast_new_change_model(instance)


def broadcast_new_change_model(instance):
    channel_layer = get_channel_layer()
    serialized_change_object = Change.serialize(instance)
    # Name of channel group
    room_group_name = instance.channel_id

    # name of indiviual_user group
    indiviual_room_group_name = instance.user_id

    if instance.created_by_id is None and instance.change_type == 2 and instance.errored is True:
        async_to_sync(channel_layer.group_send)(
            str(room_group_name),
            {
                'type': 'broadcast_errors',
                'errored': serialized_change_object
            }
        )

    if instance.created_by_id is None:
        try:
            raise NoneCreatedByIdError(instance)
        except NoneCreatedByIdError as e:
            report_exception(e)
        logging.error("Missing expected Change.created_by_id")
        return

    # if the change object is errored then we broadcast the info back to indiviual user
    if instance.errored:
        async_to_sync(channel_layer.group_send)(
            str(instance.created_by_id),
            {
                'type': 'broadcast_errors',
                'errored': serialized_change_object
            }
        )
    if instance.applied:
        # if the change is related to channel we broadcast changes to channel group
        if not indiviual_room_group_name and room_group_name:
            async_to_sync(channel_layer.group_send)(
                str(room_group_name),
                {
                    'type': 'broadcast_changes',
                    'change': serialized_change_object
                }
            )
        # if the change is only related to indiviual user
        elif indiviual_room_group_name and not room_group_name:
            async_to_sync(channel_layer.group_send)(
                str(indiviual_room_group_name),
                {
                    'type': 'broadcast_changes',
                    'change': serialized_change_object
                }
            )
        # if the change is realted to both user and channel then we will broadcast to both of the groups
        elif indiviual_room_group_name and room_group_name:
            async_to_sync(channel_layer.group_send)(
                str(room_group_name),
                {
                    'type': 'broadcast_changes',
                    'change': serialized_change_object
                }
            )
            async_to_sync(channel_layer.group_send)(
                str(indiviual_room_group_name),
                {
                    'type': 'broadcast_changes',
                    'change': serialized_change_object
                }
            )
