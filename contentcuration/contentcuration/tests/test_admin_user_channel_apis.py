import pytest
from rest_framework.test import APIRequestFactory
from rest_framework.reverse import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.test import force_authenticate
from django.db.models import Q, Count
from contentcuration.management.commands.setup import create_user, create_channel
from contentcuration.models import User, Channel
from contentcuration.views.admin import get_users, get_channels
class TestGetUsersAndChannels(APITestCase):
    @classmethod
    def setUpTestData(self):
        self.admin_user = self.first_user = create_user('a@a.com','a','a','a',True)
        # self.admin_user.save()
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

        for x in ['is_admin', 'is_not_active', 'is_chef']:
            for i in range(4):
                name = 'user_%s_%i' % (x, i)
                user = create_user(name+'@a.com', name, name, name, x=='is_admin')
                user.is_active = x != 'is_not_active'
                user.save()
                self.dummy_users.append(user)

                if x=='is_chef':
                    dummy_chef_channel.editors.add(user)
                    # dummy_chef_channel.save()
                    

        for i in range(3):
            name = 'channel%i' % i
            channel = create_channel(name, "", [self.dummy_users[i]])
            # channel.save()
            self.dummy_channels.append(channel)

        self.last_user = create_user('z@z.com','z','z','z',True)
        # self.last_user.save()

    # get_users 

    def test_get_users_for_channel(self):
        url = reverse('get_users')
        channel = self.dummy_channels[0]
        request = APIRequestFactory().get(url, {'channel_id': channel.id})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(len(response.data), channel.editors.count())

    def test_get_admin_users(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'and_is_admin': True})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(len(response.data), User.objects.filter(is_admin=True).count())

    def test_get_not_admin_users(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'and_is_admin': False})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(len(response.data), User.objects.exclude(is_admin=True).count())

    def test_get_chef_users(self):
        url = reverse('get_users')
        users = User.objects.annotate(chef_channels=Count('editable_channels__ricecooker_version'))
        num_chef_users = users.filter(chef_channels__gt=0).count()
        request = APIRequestFactory().get(url, {'and_is_chef': True})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(len(response.data), num_chef_users)

    def test_get_non_chef_users(self):
        url = reverse('get_users')
        users = User.objects.annotate(chef_channels=Count('editable_channels__ricecooker_version'))
        num_non_chef_users = users.filter(chef_channels=0).count()
        request = APIRequestFactory().get(url, {'and_is_chef': False})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(len(response.data), num_non_chef_users)

    def test_get_users_paginated(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'page_size': 1})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(len(response.data), 1)

    def test_get_users_sort_by_email_asc(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'sort_by': 'email', 'ordering': 'asc'})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(response.data[0]['email'], self.first_user.email)

    def test_get_users_sort_by_last_name_desc(self):
        url = reverse('get_users')
        request = APIRequestFactory().get(url, {'sort_by': 'last_name', 'ordering': 'desc'})
        request.user = self.admin_user
        response = get_users(request)
        self.assertEqual(response.data[0]['email'], self.last_user.email)

    # get_channels

    def test_get_all_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url)
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(len(response.data), Channel.objects.all().count())

    def test_get_channels_for_user(self):
        url = reverse('get_channels')
        user = self.dummy_users[0]
        request = APIRequestFactory().get(url, {'user_id': user.id})
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(len(response.data), user.editable_channels.count())
    
    def test_get_live_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {'and_is_live':True})
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(len(response.data), Channel.objects.exclude(deleted=True).count())

    def test_get_live_and_public_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {
                'and_is_live': True,
                'and_is_public': True
            })
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(
            len(response.data),
            Channel.objects.exclude(deleted=True).filter(public=True).count()
        )

    def test_get_live_and_public_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {
                'and_is_live': True,
                'and_is_public': True
            })
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(
            len(response.data),
            Channel.objects.exclude(deleted=True).filter(public=True).count()
        )

    def test_get_ricecooker_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {
                'and_is_ricecooker': True,
            })
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(
            len(response.data),
            Channel.objects.exclude(ricecooker_version=None).count()
        )

    def test_get_public_ricecooker_channels(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {
                'and_is_ricecooker': True,
                'and_is_public': True,
            })
        request.user = self.admin_user
        response = get_channels(request)
        channels = Channel.objects.exclude(ricecooker_version=None).filter(public=True)
        self.assertEqual(
            len(response.data),
            channels.count()
        )

    def test_sort_by_name_asc(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {'sort_by': 'name', 'ordering': 'asc'})
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(response.data[0]['name'], self.first_channel.name)

    def test_sort_by_name_desc(self):
        url = reverse('get_channels')
        request = APIRequestFactory().get(url, {'sort_by': 'name', 'ordering': 'desc'})
        request.user = self.admin_user
        response = get_channels(request)
        self.assertEqual(response.data[0]['name'], self.last_channel.name)


