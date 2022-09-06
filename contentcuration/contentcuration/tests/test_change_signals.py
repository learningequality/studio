from django.core.management import call_command
from django.test import TestCase
from mock import patch

from contentcuration.models import Change
from contentcuration.tests import testdata
from contentcuration.tests.base import BucketTestMixin
from contentcuration.tests.utils.websocket_helper import create_channel_specific_change_object
from contentcuration.tests.utils.websocket_helper import create_channel_user_common_change_object
from contentcuration.tests.utils.websocket_helper import create_errored_change_object
from contentcuration.tests.utils.websocket_helper import create_user_specific_change_object
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.viewsets.sync.constants import CHANNEL


class ChangeSignalTestCase(TestCase, BucketTestMixin):
    def setUp(self):
        call_command("loadconstants")
        if not self.persist_bucket:
            self.create_bucket()
        self.user = testdata.user("mrtest@testy.com")
        self.channel = testdata.channel()
        self.channel.editors.add(self.user)
        self.client.force_login(user=self.user)

    def tearDown(self):
        if not self.persist_bucket:
            self.delete_bucket()
        self.user.delete()

    @patch('contentcuration.viewsets.websockets.signals.broadcast_new_change_model')
    def test_change_signal_handler(self, mock_signal):
        """
        Test if signal is getting triggered when an change object gets created.
        """
        self.client.force_login(self.user)
        new_name = "This is not the old name"
        Change.create_change(generate_update_event(self.channel.id, CHANNEL, {"name": new_name}, channel_id=self.channel.id), created_by_id=self.user.id)
        assert mock_signal.call_count == 1

    @patch('contentcuration.viewsets.websockets.signals.async_to_sync')
    @patch('contentcuration.viewsets.websockets.signals.get_channel_layer')
    def test_signal_handler_channel_specific_changes(self, mock_get_channel_layer, mock_async_to_sync):
        """
        Test changes that are specific to channel(change channel name) only.
        """
        change_serialized = create_channel_specific_change_object(self.user, self.channel)
        channel_layer = mock_get_channel_layer.return_value
        assert 2 == mock_async_to_sync.call_count
        mock_async_to_sync.assert_called_with(channel_layer.group_send)
        async_mock_return_value = mock_async_to_sync.return_value
        async_mock_return_value.assert_any_call(str(self.user.id), {
            'type': 'broadcast_success',
            'success': change_serialized
        })
        async_mock_return_value.assert_any_call(self.channel.id, {
            'type': 'broadcast_changes',
            'change': change_serialized
        })

    @patch('contentcuration.viewsets.websockets.signals.async_to_sync')
    @patch('contentcuration.viewsets.websockets.signals.get_channel_layer')
    def test_signal_handler_user_specific_changes(self, mock_get_channel_layer, mock_async_to_sync):
        """
        Test changes that are specific to user(bookmarks) only.
        """
        change_serialized = create_user_specific_change_object(self.user, self.channel)
        channel_layer = mock_get_channel_layer.return_value
        mock_async_to_sync.assert_called_once_with(channel_layer.group_send)
        async_mock_return_value = mock_async_to_sync.return_value
        async_mock_return_value.assert_any_call(str(self.user.id), {
            'type': 'broadcast_success',
            'success': change_serialized
        })

    @patch('contentcuration.viewsets.websockets.signals.async_to_sync')
    @patch('contentcuration.viewsets.websockets.signals.get_channel_layer')
    def test_signal_handler_user_channel_common_changes(self, mock_get_channel_layer, mock_async_to_sync):
        """
        Test changes that are common to both channel and user(invitations).
        """
        editor = self.user
        change_serialized = create_channel_user_common_change_object(editor, self.channel)
        channel_layer = mock_get_channel_layer.return_value
        assert 2 == mock_async_to_sync.call_count
        mock_async_to_sync.assert_called_with(channel_layer.group_send)
        async_mock_return_value = mock_async_to_sync.return_value
        assert 2 == mock_async_to_sync.call_count
        async_mock_return_value.assert_any_call(self.channel.id, {
            'type': 'broadcast_changes',
            'change': change_serialized
        })
        async_mock_return_value.assert_any_call(str(self.user.id), {
            'type': 'broadcast_success',
            'success': change_serialized
        })

    @patch('contentcuration.viewsets.websockets.signals.async_to_sync')
    @patch('contentcuration.viewsets.websockets.signals.get_channel_layer')
    def test_signal_handler_errored_changes(self, mock_get_channel_layer, mock_async_to_sync):
        """
        Test changes that are errored!
        """
        change_serialized = create_errored_change_object(self.user, self.channel)
        channel_layer = mock_get_channel_layer.return_value
        mock_async_to_sync.assert_called_once_with(channel_layer.group_send)
        async_mock_return_value = mock_async_to_sync.return_value
        assert 1 == mock_async_to_sync.call_count
        async_mock_return_value.assert_called_once_with(str(self.user.id), {
            'type': 'broadcast_errors',
            'errored': change_serialized
        })
