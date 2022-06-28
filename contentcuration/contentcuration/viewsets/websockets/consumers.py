from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer


class SyncConsumer(WebsocketConsumer):

    # Checks permissions
    def check_perms(self):
        return self.scope['user'].is_authenticated

    # Initial reset
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_name = None
        self.room_group_name = None
        self.user_id = None

    # This function gets executed when a user tries to make a websocket connection.
    #   - Creates and joins a group for indiviual user
    #   - Joins a public group based on channel_id provided in url
    def connect(self):

        # Extract the channel_id from url
        self.room_name = self.scope['url_route']['kwargs']['channel_id']
        self.room_group_name = self.room_name
        print("----------------------------------")
        print("Connected to channel_id: " + self.room_name)
        print("----------------------------------")
        # Create a private group for
        self.user = self.scope["user"]
        self.indiviual_room_group_name = "asdasdasdasd"
        print("----------------------------------")
        print("Connected to user_id: " + str(self.user))
        print("----------------------------------")

        if self.scope['user'].is_authenticated:
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
