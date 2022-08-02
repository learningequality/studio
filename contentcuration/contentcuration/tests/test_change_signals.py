import uuid

from django.core.management import call_command
from django.test import TestCase
from mock import patch

from contentcuration.models import Change
from contentcuration.tests import testdata
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.viewsets.sync.constants import BOOKMARK
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import EDITOR_M2M


class ChangeSignalTestCase(TestCase):
    def setUp(self):
        call_command("loadconstants")
        self.user = testdata.user("mrtest@testy.com")
        self.channel = testdata.channel()
        self.channel.editors.add(self.user)

    def tearDown(self):
        self.user.delete()

    @property
    def channel_metadata(self):
        return {
            "name": "ozer's cool channel",
            "id": uuid.uuid4().hex,
            "description": "coolest channel that side of the Pacific",
        }

    @property
    def bookmark_metadata(self):
        return {
            "channel": self.channel.id,
        }

    @patch('contentcuration.viewsets.websockets.signals.broadcast_new_change_model')
    def test_change_signal_handler(self, mock_signal):
        """
        Test if signal is getting triggered when an change object gets created.
        """
        self.client.force_login(self.user)
        new_name = "This is not the old name"
        Change.create_change(generate_update_event(self.channel.id, CHANNEL, {"name": new_name}, channel_id=self.channel.id))
        assert mock_signal.call_count == 1

    @patch('contentcuration.viewsets.websockets.signals.async_to_sync')
    @patch('contentcuration.viewsets.websockets.signals.get_channel_layer')
    def test_signal_handler_channel_specific_changes(self, mock_get_channel_layer, mock_async_to_sync):
        """
        Test changes that are specific to channel(change channel name) only.
        """
        new_name = "This is not the old name"
        change_obj = Change.create_change(generate_update_event(self.channel.id, CHANNEL, {"name": new_name}, channel_id=self.channel.id))

        change_serialized = Change.serialize(change_obj)

        channel_layer = mock_get_channel_layer.return_value
        mock_async_to_sync.assert_called_once_with(channel_layer.group_send)
        async_mock_return_value = mock_async_to_sync.return_value
        async_mock_return_value.assert_called_once_with(self.channel.id, {
            'type': 'broadcast_changes',
            'change': change_serialized
        })

    @patch('contentcuration.viewsets.websockets.signals.async_to_sync')
    @patch('contentcuration.viewsets.websockets.signals.get_channel_layer')
    def test_signal_handler_user_specific_changes(self, mock_get_channel_layer, mock_async_to_sync):
        """
        Test changes that are specific to user(bookmarks) only.
        """
        self.client.force_login(user=self.user)
        bookmark = self.bookmark_metadata
        change_obj = Change.create_change(generate_create_event(
            bookmark["channel"],
            BOOKMARK,
            bookmark,
            user_id=self.user.id,
        ))
        change_serialized = Change.serialize(change_obj)
        channel_layer = mock_get_channel_layer.return_value
        mock_async_to_sync.assert_called_with(channel_layer.group_send)
        async_mock_return_value = mock_async_to_sync.return_value
        async_mock_return_value.assert_called_with(self.user.id, {
            'type': 'broadcast_changes',
            'change': change_serialized
        })

    @patch('contentcuration.viewsets.websockets.signals.async_to_sync')
    @patch('contentcuration.viewsets.websockets.signals.get_channel_layer')
    def test_signal_handler_user_channel_common_changes(self, mock_get_channel_layer, mock_async_to_sync):
        """
        Test changes that are common to both channel and user(invitations).
        """
        editor = self.user
        self.client.force_login(self.user)
        change_obj = Change.create_change(generate_create_event([editor.id, self.channel.id], EDITOR_M2M, {}, channel_id=self.channel.id, user_id=editor.id))
        change_serialized = Change.serialize(change_obj)
        channel_layer = mock_get_channel_layer.return_value
        mock_async_to_sync.assert_called_with(channel_layer.group_send)
        async_mock_return_value = mock_async_to_sync.return_value
        async_mock_return_value.assert_called_with(editor.id, {
            'type': 'broadcast_changes',
            'change': change_serialized
        })
        assert 2 == mock_async_to_sync.call_count
        async_mock_return_value.assert_any_call(self.channel.id, {
            'type': 'broadcast_changes',
            'change': change_serialized
        })
        async_mock_return_value.assert_any_call(editor.id, {
            'type': 'broadcast_changes',
            'change': change_serialized
        })
