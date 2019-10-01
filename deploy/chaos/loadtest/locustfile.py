#!/usr/bin/env python
import os
from random import choice

from locust import HttpLocust
from locust import task
from locust import TaskSet
try:
    import urllib.request as urlrequest
except ImportError:
    import urllib as urlrequest

USERNAME = os.getenv("LOCUST_USERNAME") or "a@a.com"
PASSWORD = os.getenv("LOCUST_PASSWORD") or "a"


class BaseTaskSet(TaskSet):
    max_wait = 60000

    def _login(self):
        """
        Helper function to log in the user to the current session.
        """
        resp = self.client.get("/accounts/login/")
        csrf = resp.cookies["csrftoken"]

        formdata = {
            "username": USERNAME,
            "password": PASSWORD,
            "csrfmiddlewaretoken": csrf,
        }
        self.client.post(
            "/accounts/login/",
            data=formdata,
            headers={
                "content-type": "application/x-www-form-urlencoded",
                "referer": "https://develop.studio.learningequality.org/accounts/login/"
            }
        )


class ChannelListPage(BaseTaskSet):
    """
    Task to explore different channels lists
    """
    def on_start(self):
        self._login()

    def channel_list_api_calls(self):
        self.client.get("/get_user_pending_channels/")
        self.client.get("/get_user_edit_channels/")
        self.client.get("/get_user_bookmarked_channels/")
        self.client.get("/get_user_public_channels/")
        self.client.get("/get_user_view_channels/")

    @task
    def channel_list(self):
        """
        Load the channel page and the important endpoints.
        """
        self.client.get("/channels/")
        self.channel_list_api_calls()


class ChannelPage(BaseTaskSet):
    """
    Task to open and view a channel, including its topics and nodes
    """
    def on_start(self):
        self._login()

    def get_first_public_channel_id(self):
        """
        Returns the id of the first available public channel
        :returns: id of the first available public channel or None if there are not public channels
        """
        resp = self.client.get("/get_user_public_channels/").json()
        try:
            channel_id = resp[0]['id']
        except IndexError:
            channel_id = None
        return channel_id

    def get_topic_id(self, channel_id, random=False):
        """
        Returns the id of a randomly selected topic for the provided channel_id
        :param: channel_id: id of the channel where the topic must be found
        :returns: id of the selected topic
        """
        channel_resp = self.client.get('/api/channel/{}'.format(channel_id)).json()
        children = channel_resp['main_tree']['children']
        topic_id = children[0]
        if random:
            topic_id = choice(children)
        return topic_id

    def get_resource_id(self, topic_id, random=False):
        """
        Returns the id of a randoly selected resource for the provided topic_id
        :param: topic_id: id of the topic where the resource must be found
        :returns: id of the selected resource
        """
        nodes_resp = self.client.get('/api/get_nodes_by_ids/{}'.format(topic_id)).json()
        try:
            while nodes_resp[0]['kind'] == 'topic':
                nodes = nodes_resp[0]['children']
                nodes_resp = self.client.get('/api/get_nodes_by_ids/{}'.format(','.join(nodes))).json()
            node_id = nodes_resp[0]['id']
            if random:
                node_id = choice(nodes_resp)['id']
            return node_id
        except IndexError:
            return None

    @task
    def open_channel(self, channel_id=None):
        """
        Open to edit a channel, if channel_id is None it opens the first public channel
        """
        if not channel_id:
            channel_id = self.get_first_public_channel_id()
        if channel_id:
            self.client.get('/channels/{}'.format(channel_id))

    # This is the most frequently hit scenario outside of ricecooker usage, so give it more weight.
    @task(3)
    def open_subtopic(self, channel_id=None, topic_id=None):
        """
        Open  a topic, if channel_id is None it opens the first public channel
        """
        if not channel_id:
            channel_id = self.get_first_public_channel_id()
        if channel_id and not topic_id:
            topic_id = self.get_topic_id(channel_id)
        if topic_id:
            self.get_resource_id(topic_id)

    @task
    def preview_content_item(self, content_id=None, random=False):
        """
        Do request on all the files for a content item.
        If content_id is not provided it will fetch a random content
        """
        if not content_id:
            channel_id = self.get_first_public_channel_id()
            topic_id = self.get_topic_id(channel_id, random=random)
            content_id = self.get_resource_id(topic_id, random=random)
            if content_id:
                resp = self.client.get('/api/get_nodes_by_ids_complete/{}'.format(content_id)).json()
                if 'files' in resp[0]:
                    for resource in resp[0]['files']:
                        storage_url = resource['storage_url']
                        print("Requesting resource {}".format(storage_url))
                        urlrequest.urlopen(storage_url).read()


class ChannelClone(BaseTaskSet):
    def on_start(self):
        self._login()


class LoginPage(BaseTaskSet):
    tasks = [ChannelListPage, ChannelPage]

    # This is by far our most hit endpoint, over 50% of all calls, so
    # weight it accordingly.
    @task(10)
    def loginpage(self):
        """
        Visit the login page and the i18n endpoints without logging in.
        """
        self.client.get("/accounts/login/")


class StudioDesktopBrowserUser(HttpLocust):
    task_set = LoginPage
    min_wait = 5000
    max_wait = 20000
