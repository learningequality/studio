from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from contentcuration.models import Change


@receiver(post_save, sender=Change, weak=False)
def broadcast_new_change_model(sender, instance, created, **kwargs):
    channel_layer = get_channel_layer()
    print(instance.__dict__)
    serialized_change_object = Change.serialize(instance)
    room_group_name = instance.channel_id
    indiviual_room_group_name = instance.user_id
    # if the change is only related to user we broadcast changes only to user
    if not indiviual_room_group_name and room_group_name:
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'broadcast_changes',
                'change': serialized_change_object
            }
        )
    elif indiviual_room_group_name and not room_group_name:
        async_to_sync(channel_layer.group_send)(
            indiviual_room_group_name,
            {
                'type': 'broadcast_changes',
                'change': serialized_change_object
            }
        )

    async_to_sync(channel_layer.group_send)(
        room_group_name,
        {
            'type': 'broadcast_changes',
            'change': serialized_change_object
        }
    )
