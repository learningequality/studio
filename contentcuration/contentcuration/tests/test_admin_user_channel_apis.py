from rest_framework.test import APIRequestFactory
from rest_framework.reverse import reverse
from django.db.models import Count
from contentcuration.management.commands.setup import create_user
from contentcuration.management.commands.setup import create_channel
from contentcuration.models import User
from contentcuration.models import Channel
from contentcuration.views.admin import AdminUserListView
from contentcuration.views.admin import AdminChannelListView
from base import BaseAPITestCase

get_users = AdminUserListView.as_view()
get_channels = AdminChannelListView.as_view()


class TestGetUsersAndChannels(BaseAPITestCase):
    @classmethod
    def setUpTestData(self):
        self.admin_user = self.first_user = create_user('a@a.com', 'a', 'a', 'a', True)
        dummy_chef_channel = create_channel('a_chef_channel')
        dummy_chef_channel.ricecooker_version = 'ricecooker of the future!'
        dummy_chef_channel.public = False
        dummy_chef_channel.save()
        self.first_channel = dummy_chef_channel

        dummy_chef_channel_public = create_channel('z_chef_channel_public')
        dummy_chef_channel_public.ricecooker_version = 'ricecooker of the future!'
        dummy_chef_channel_public.public = True
        dummy_chef_channel_public.save()
        self.last_channel = dummy_chef_channel_public

        self.dummy_users = []
        self.dummy_channels = [dummy_chef_channel]

        num_users = 4
        for x in ['is_admin', 'is_not_active', 'is_chef']:
            for i in range(num_users):
                name = 'user_%s_%i' % (x, i)
                user = create_user(name+'@a.com', name, name, name, x == 'is_admin')
                user.is_active = x != 'is_not_active'
                user.save()
                self.dummy_users.append(user)

                if x == 'is_chef':
                    dummy_chef_channel.editors.add(user)

        for i in range(3):
            name = 'channel%i' % i
            channel = create_channel(name, "", [self.dummy_users[i]])
            self.dummy_channels.append(channel)

        self.last_user = create_user('z@z.com', 'z', 'z', 'z', True)

    # def test_get_users_for_channel(self):
    #     url = reverse('get_users')
    #     channel = self.dummy_channels[0]
    #     request = APIRequestFactory().get(url, {'editable_channels__contains': channel.id})
    #     request.user = self.admin_user
    #     response = get_users(request)
    #     self.assertEqual(response.data.get('count'), channel.editors.count())

    def test_get_admin_users(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'is_admin': True})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(response.data.get('count'), User.objects.filter(is_admin=True).count())

    def test_get_not_admin_users(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'is_admin': False})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(response.data.get('count'), User.objects.exclude(is_admin=True).count())

    def test_get_chef_users(self):
        url = reverse('get_users')
        users = User.objects.annotate(chef_channels=Count('editable_channels__ricecooker_version'))
        num_chef_users = users.filter(chef_channels__gt=0).count()
        request = APIRequestFactory().get(url, {'chef_channels_count__gt': 0})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(response.data.get('count'), num_chef_users)

    def test_get_non_chef_users(self):
        url = reverse('get_users')
        users = User.objects.annotate(chef_channels=Count('editable_channels__ricecooker_version'))
        num_non_chef_users = users.filter(chef_channels=0).count()
        request = APIRequestFactory().get(url, {'chef_channels_count': 0})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(response.data.get('count'), num_non_chef_users)

    def test_get_users_paginated(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'page_size': 1})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(len(response.data.get('results')), 1)

    def test_get_users_sort_by_email_asc(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'ordering': 'email'})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(response.data.get('results')[0]['email'], self.first_user.email)

    def test_get_users_sort_by_last_name_desc(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'ordering': '-email'})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(response.data.get('results')[0]['email'], self.last_user.email)

    def test_get_all_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url)
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(response.data.get('count'), Channel.objects.all().count())

    # def test_get_channels_for_user(self):
    #     url = reverse('get_channels')
    #     user = self.dummy_users[0]
    #     request = APIRequestFactory().get(url, {'user_id': user.id})
    #     request.user = self.admin_user
    #     response = get_channels(request)
    #     self.assertEqual(response.data.get('count'), user.editable_channels.count())

    def test_get_live_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {'is_live': True})
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(response.data.get('count'), Channel.objects.exclude(deleted=True).count())

    def test_get_live_and_public_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {
            'deleted': False,
            'public': True
        })
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(
            response.data.get('count'),
            Channel.objects.exclude(deleted=True).filter(public=True).count()
        )

    def test_get_ricecooker_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {
            'ricecooker_version__isnull': False,
        })
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(
            response.data.get('count'),
            Channel.objects.exclude(ricecooker_version=None).count()
        )

    def test_get_public_ricecooker_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {
            'ricecooker_version__isnull': False,
            'public': True,
        })
        request.user = self.admin_user
        response = get_channels(request)
        channels = Channel.objects.exclude(ricecooker_version=None).filter(public=True)
        self.assertEqual(
            response.data.get('count'),
            channels.count()
        )

    def test_sort_by_name_asc(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {'ordering': 'name'})
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(response.data.get('results')[0]['name'], self.first_channel.name)

    def test_sort_by_name_desc(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {'ordering': '-name'})
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(response.data.get('results')[0]['name'], self.last_channel.name)
