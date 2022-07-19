import json
import logging as logger

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.tasks import get_or_create_async_task
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import CREATED


logging = logger.getLogger(__name__)


class SyncConsumer(WebsocketConsumer):
    # Initial reset
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_group_name = None
        self.indiviual_room_group_name = None

    @property
    def user(self):
        return self.scope["user"]

    # Checks permissions
    def check_authentication(self):
        return self.user.is_authenticated

    def connect(self):
        """
        Executes when a user tries to make a websocket connection.
        - Creates and joins a group for indiviual user
        - Joins a public group based on channel_id provided in url
        """
        # Extract the channel_id from url
        self.room_group_name = self.scope['url_route']['kwargs']['channel_id']

        logging.debug("Connected to channel_id: " + self.room_group_name)

        self.indiviual_room_group_name = str(self.user.id)

        logging.debug("Connected to user " + str(self.user))

        if self.check_authentication():
            # Join room group based on channel_id
            async_to_sync(self.channel_layer.group_add)(
                self.room_group_name,
                self.channel_name
            )

            # Join private room group for indiviual user
            async_to_sync(self.channel_layer.group_add)(
                self.indiviual_room_group_name,
                self.channel_name
            )

            self.accept()

        else:
            self.close()

    def disconnect(self, close_code):
        """
        Executed to leave indiviual-user and channel group
        """
        # Leave channel_id room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )

        # Leave indiviual room group
        async_to_sync(self.channel_layer.group_discard)(
            self.indiviual_room_group_name,
            self.channel_name
        )

    def receive(self, text_data):
        """
        Executes when data is received from websocket
        """
        response_payload = {
            "disallowed": [],
            "allowed": [],
        }
        user_id = self.user.id
        session_key = self.scope['cookies']['kolibri_studio_sessionid']
        text_data_json = json.loads(text_data)
        changes = text_data_json["payload"]["changes"]

        change_channel_ids = set(x.get("channel_id") for x in changes if x.get("channel_id"))
        # Channels that have been created on the client side won't exist on the server yet, so we need to add a special exception for them.
        created_channel_ids = set(x.get("channel_id") for x in changes if x.get("channel_id") and x.get("table") == CHANNEL and x.get("type") == CREATED)
        # However, this would also give people a mechanism to edit existing channels on the server side by adding a channel create event for an
        # already existing channel, so we have to filter out the channel ids that are already created on the server side, regardless of whether
        # the user making the requests has permissions for those channels.
        created_channel_ids = created_channel_ids.difference(
            set(Channel.objects.filter(id__in=created_channel_ids).values_list("id", flat=True).distinct())
        )
        allowed_ids = set(
            Channel.filter_edit_queryset(Channel.objects.filter(id__in=change_channel_ids), self.user).values_list("id", flat=True).distinct()
        ).union(created_channel_ids)
        # Allow changes that are either:
        # Not related to a channel and instead related to the user if the user is the current user.
        user_only_changes = []
        # Related to a channel that the user is an editor for.
        channel_changes = []
        # Changes that cannot be made
        disallowed_changes = []
        for c in changes:
            if c.get("channel_id") is None and c.get("user_id") == user_id:
                user_only_changes.append(c)
            elif c.get("channel_id") in allowed_ids:
                channel_changes.append(c)
            else:
                disallowed_changes.append(c)
        change_models = Change.create_changes(user_only_changes + channel_changes, created_by_id=user_id, session_key=session_key)
        if user_only_changes:
            get_or_create_async_task("apply_user_changes", self.user, user_id=user_id)
        for channel_id in allowed_ids:
            get_or_create_async_task("apply_channel_changes", self.user, channel_id=channel_id)
        allowed_changes = [{"rev": c.client_rev, "server_rev": c.server_rev} for c in change_models]
        response_payload.update({"disallowed": disallowed_changes, "allowed": allowed_changes})

        self.send(json.dumps({
            'response_payload': response_payload
        }))
