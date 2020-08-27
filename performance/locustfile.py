#!/usr/bin/env python
import json
import logging
import os
import time

from locust import HttpUser
from locust import task
from locust import TaskSet
try:
    import urllib.request as urlrequest
except ImportError:
    import urllib as urlrequest

num_clients = 0


class BaseTaskSet(TaskSet):
    max_wait = 60000
    task_url = None

    def auth_get(self, url):
        base_url = self.client.base_url
        if self.task_url:
            base_url = '{}{}'.format(self.client.base_url, self.task_url)

        headers = {
                    "content-type": "application/json",
                    'X-CSRFToken': self.client.cookies.get('csrftoken'),
                    'Referer': base_url
                }

        response = self.client.get(url, headers=headers)
        if response.status_code not in [200, 302]:
            logging.error("ERROR {}: {}".format(response.status_code, url))
            logging.error("user: {}".format(self.user.username))
            logging.error("Headers = {}".format(headers))
        else:
            logging.info("{} {}".format(response.status_code, url[:100]))
            logging.info("response time: {}, response length: {}".format(response.elapsed.total_seconds(), len(response.content)))

        return response

    def _run_async_task(self, url, channel_id, data):
        copy_resp = self.client.post(url,
                                     data=json.dumps(data),
                                     headers={
                                         "content-type": "application/json",
                                         'X-CSRFToken': self.client.cookies.get('csrftoken'),
                                         'Referer': self.client.base_url
                                     })
        copy_resp_data = copy_resp.json()
        task_id = copy_resp_data["id"]
        finished = False
        time_elapsed = 0
        status = 'QUEUED'
        while not finished:
            time.sleep(1)
            time_elapsed += 1
            task_resp = self.client.get("/api/task/{}?channel_id={}".format(task_id, channel_id))
            task_data = task_resp.json()
            if task_data["status"] in ["SUCCESS", "FAILED"] or time_elapsed > 120:
                finished = True
                status = task_data["status"]

        return status


class ChannelListPage(BaseTaskSet):
    """
    Task to explore different channels lists
    """
    task_url = '/channels/'
    def channel_list_api_calls(self):

        self.auth_get("/api/channel?edit=true")
        self.auth_get("/api/invitation?invited=8")

    @task
    def channel_list(self):
        """
        Load the channel page and the important endpoints.
        """
        self.auth_get("/channels/")
        self.channel_list_api_calls()


class ChannelEditPage(BaseTaskSet):
    @task(1)
    def channel_edit_root(self):
        self.auth_get('/channels/4dd927d9039c5c4fb9b0a0f7024f532d/')
        self.auth_get('/api/tree?channel_id=4dd927d9039c5c4fb9b0a0f7024f532d')
        self.auth_get('/api/tree?parent=7714fe2310a54a4eafc36597d5f00c91&tree_id=7714fe2310a54a4eafc36597d5f00c91')

        self.auth_get('/api/contentnode?id__in=00c79fa410a845508f86b820b82c7d2e')
        # there is supposed to be a call to retrieve content nodes here, but in the actual page load
        # it requests 780 nodes.


class ChannelEdit(BaseTaskSet):
    # This flag was recommended to ensure on_stop is always called, but it seems not to be enough
    # on its own to ensure this behavior. Leaving as it's possible this is needed, but along with
    # something else.
    always_run_on_stop = True

    def on_start(self):
        self.created_channels = []

    def on_stop(self):
        # FIXME: This is not being called when the run completes, need to find out why.
        # Note that until this is fixed, any channel with the name "Locust Test Channel"
        # in the database needs to be manually deleted.
        for channel in self.created_channels:
            self.client.delete(
                "/api/channel/{}/".format(channel),
                headers={
                    "content-type": "application/json",
                    'X-CSRFToken': self.client.cookies.get('csrftoken'),
                }
            )

            # TODO: check for deletion issues and report so that manual cleanup can be performed if needed.

    @task(6)
    def create_channel_and_copy_content(self):
        """
        Load the channel page and the important endpoints.
        """
        formdata = {
            "name": "Locust Test Channel",
            "description": "Description of locust test channel",
            "thumbnail_url": '/static/img/kolibri_placeholder.png',
            "count": 0,
            "size": 0,
            "published": False,
            "view_only": False,
            "viewers": [],
            "content_defaults": {},
            "pending_editors": []
        }
        resp = self.client.post(
            "/api/channel",
            data=json.dumps(formdata),
            headers={
                "content-type": "application/json",
                'X-CSRFToken': self.client.cookies.get('csrftoken'),
                'Referer': self.client.base_url
            }
        )

        data = resp.json()
        channel_id = data["id"]

        try:
            copy_data = {
                # KA Computing root node.
                "node_ids": ["76d5fd8636004b459a09aecbb2f8294e"],
                "sort_order": 1,
                "target_parent": data["main_tree"]["id"],
                "channel_id": channel_id
            }

            self._run_async_task('/api/duplicate_nodes/', channel_id, copy_data)

        finally:
            self.client.delete(
                "/api/channel/{}".format(channel_id),
                headers={
                    "content-type": "application/json",
                    'X-CSRFToken': self.client.cookies.get('csrftoken'),
                    'Referer': self.client.base_url
                }
            )


class LoginPage(BaseTaskSet):
    tasks = [ChannelListPage, ChannelEditPage]

    # This is by far our most hit endpoint, over 50% of all calls, so
    # weight it accordingly.
    @task(10)
    def loginpage(self):
        """
        Visit the login page and the i18n endpoints without logging in.
        """
        self.client.get("/accounts/")


class StudioDesktopBrowserUser(HttpUser):
    tasks = [LoginPage, ChannelListPage]
    min_wait = 5000
    max_wait = 20000
    # we will assign username when the client starts
    username = None
    password = "ivanisthe1"
    host = os.getenv("LOCUST_URL") or "http://localhost:8080"

    def on_start(self):
        """
        Helper function to log in the user to the current session.
        """
        resp = self.client.get("/accounts/")
        csrf = resp.cookies["csrftoken"]
        if not self.username:
            global num_clients
            self.username = "ivanbot{}@leq.org".format(num_clients)
            num_clients += 1

        logging.info("num_clients = {}".format(num_clients))
        formdata = {
            "username": self.username,
            "password": self.password,
        }
        self.client.post(
            "/accounts/login/",
            data=json.dumps(formdata),
            headers={
                "content-type": "application/x-www-form-urlencoded",
                "referer": "{}/accounts/".format(self.client.base_url),
                "X-CSRFToken": csrf
            }
        )
