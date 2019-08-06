from base import BaseAPITestCase
from django.conf import settings
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.core.urlresolvers import reverse_lazy
from django.db import connection
from django.db import reset_queries

from contentcuration.models import SecretToken
from contentcuration.serializers import StudioChannelListSerializer
from contentcuration.views.base import get_channels_by_token
from contentcuration.views.base import get_user_bookmarked_channels
from contentcuration.views.base import get_user_edit_channels
from contentcuration.views.base import get_user_public_channels
from contentcuration.views.base import get_user_view_channels


class ChannelListTestCase(BaseAPITestCase):
    """
    Test the channel list APIs to ensure they return proper results and match desired performance metrics
    """

    def setUp(self):
        super(ChannelListTestCase, self).setUp()
        self.debug_setting = settings.DEBUG

    def tearDown(self):
        settings.DEBUG = self.debug_setting
        # Make sure subsequent tests aren't working with cached data.
        cache.clear()

    def assertHasSerializerFields(self, data, serializer):
        """
        Check that all the fields defined on the serializer exist in the output.

        :param data: A single record from the serializer output
        :param serializer: The serializer class (not object) to check fields against
        """
        for field in serializer().Meta.fields:
            assert field in data

    def assertQueriesLessThan(self, max=10):
        """
        Check the number of queries run by the test, as a large number of queries is often a sign of an API
        that will perform poorly and bog the server down.

        :param max: The number of queries that is beyond the acceptable limit.
        """
        assert settings.DEBUG, "Checking queries requires DEBUG to be set"
        num_queries = len(connection.queries)
        assert num_queries > 0 and num_queries < max

    def test_no_public_channels(self):
        """
        Ensure that if there are no public channels, we get 0 results from the serializer.
        """
        response = self.client.get(reverse('get_user_public_channels'))
        self.assertEqual(len(response.data), 0)
        self.assertEqual(response.status_code, 200)

    def test_get_public_channel_list(self):
        """
        Ensure we get a valid response with channel information when we have one or more public channels.
        """
        self.channel.make_public(bypass_signals=True)

        response = self.client.get(reverse('get_user_public_channels'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertHasSerializerFields(response.data[0], StudioChannelListSerializer)

    def test_get_public_channel_query_performance(self):
        """
        Test that we are not running too many queries in order to return a single public channel result.
        """
        self.channel.make_public(bypass_signals=True)
        settings.DEBUG = True

        reset_queries()
        request = self.create_get_request(reverse('get_user_public_channels'))
        response = get_user_public_channels(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        # This is a warning sign for performance problems, so if the number of queries goes above this
        # number, we need to evaluate the change and see if we can do something to optimize.
        self.assertQueriesLessThan(10)

    def test_no_editable_channels(self):
        """
        Ensure that if there are no channels editable by the user, we get 0 results from the serializer.
        """
        self.channel.editors.remove(self.user)
        response = self.client.get(reverse('get_user_edit_channels'))
        self.assertEqual(len(response.data), 0)
        self.assertEqual(response.status_code, 200)

    def test_get_editable_channel_list(self):
        """
        Ensure we get a valid response with channel information when we have one or more editable channels.
        """
        self.channel.editors.add(self.user)
        self.channel.save()

        response = self.client.get(reverse('get_user_edit_channels'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertHasSerializerFields(response.data[0], StudioChannelListSerializer)

    def test_get_editable_channel_query_performance(self):
        """
        Test that we are not running too many queries in order to return a single editable channel result.
        """
        settings.DEBUG = True

        self.channel.editors.add(self.user)
        self.channel.save()

        reset_queries()
        request = self.create_get_request(reverse('get_user_edit_channels'))
        response = get_user_edit_channels(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        # This is a warning sign for performance problems, so if the number of queries goes above this
        # number, we need to evaluate the change and see if we can do something to optimize.
        self.assertQueriesLessThan(10)

    def test_no_bookmarked_channels(self):
        """
        Ensure that if there are no channels bookmarked by the user, we get 0 results from the serializer.
        """
        response = self.client.get(reverse('get_user_bookmarked_channels'))
        self.assertEqual(len(response.data), 0)
        self.assertEqual(response.status_code, 200)

    def test_get_bookmarked_channel_list(self):
        """
        Ensure we get a valid response with channel information when we have one or more bookmarked channels.
        """
        self.channel.bookmarked_by.add(self.user)
        self.channel.save()

        response = self.client.get(reverse('get_user_bookmarked_channels'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertHasSerializerFields(response.data[0], StudioChannelListSerializer)

    def test_get_bookmarked_channel_query_performance(self):
        """
        Test that we are not running too many queries in order to return a single bookmarked channel result.
        """
        settings.DEBUG = True

        self.channel.bookmarked_by.add(self.user)
        self.channel.save()

        reset_queries()
        request = self.create_get_request(reverse('get_user_bookmarked_channels'))
        response = get_user_bookmarked_channels(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        # This is a warning sign for performance problems, so if the number of queries goes above this
        # number, we need to evaluate the change and see if we can do something to optimize.
        self.assertQueriesLessThan(10)

    def test_no_viewable_channels(self):
        """
        Ensure that if there are no channels viewable by the user, we get 0 results from the serializer.
        """
        response = self.client.get(reverse('get_user_view_channels'))
        self.assertEqual(len(response.data), 0)
        self.assertEqual(response.status_code, 200)

    def test_get_viewable_channel_list(self):
        """
        Ensure we get a valid response with channel information when we have one or more viewable channels.
        """
        self.channel.viewers.add(self.user)
        self.channel.save()

        response = self.client.get(reverse('get_user_view_channels'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertHasSerializerFields(response.data[0], StudioChannelListSerializer)

    def test_get_viewable_channel_query_performance(self):
        """
        Test that we are not running too many queries in order to return a single viewable channel result.
        """
        settings.DEBUG = True

        self.channel.viewers.add(self.user)
        self.channel.save()

        reset_queries()
        request = self.create_get_request(reverse('get_user_view_channels'))
        response = get_user_view_channels(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        # This is a warning sign for performance problems, so if the number of queries goes above this
        # number, we need to evaluate the change and see if we can do something to optimize.
        self.assertQueriesLessThan(10)

    def test_get_channels_by_token_list(self):
        """
        Ensure we get a valid response with channel information when we have one or more channels by token.
        """

        token = SecretToken.objects.create(token='hello-world', is_primary=True)
        self.channel.secret_tokens.add(token)
        self.channel.save()

        response = self.client.get(reverse_lazy('get_channels_by_token', kwargs={'token': 'hello-world'}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertHasSerializerFields(response.data[0], StudioChannelListSerializer)

    def test_get_channels_by_token_query_performance(self):
        """
        Test that we are not running too many queries in order to return a single channel by token result.
        """
        settings.DEBUG = True

        token = SecretToken.objects.create(token='hello-world', is_primary=True)

        self.channel.secret_tokens.add(token)
        self.channel.save()

        reset_queries()
        request = self.create_get_request(reverse_lazy('get_channels_by_token', kwargs={'token': 'hello-world'}))
        response = get_channels_by_token(request, 'hello-world')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        # This is a warning sign for performance problems, so if the number of queries goes above this
        # number, we need to evaluate the change and see if we can do something to optimize.
        self.assertQueriesLessThan(10)
