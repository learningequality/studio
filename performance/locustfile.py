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
        self.auth_get(url='/channels/f634497cc8f95a35a0c790d02449411a/')
        self.auth_get(url='/api/tree?channel_id=f634497cc8f95a35a0c790d02449411a')
        self.auth_get(url='/api/contentnode?id__in=d04f3983f8a248778749bff3fe9bf7a1')
        self.auth_get(
            url='/api/contentnode?id__in=032166383a674a3392075fb1ec68fcd3%2C04d6fde0823146abbf5fdf8577c923f6%2C140f7ff8650e474f9855fc451c5404b3%2C1513757439de47f4a0cd6ae35874c915%2C276c36a7ef2e44b48b8eda87dc6b0bf8%2C28474df5260847bf86e9a6e2441aac15%2C29efdfd5db2845a18ea316fafba11b92%2C2f4014c81fef47aea3471793672765f8%2C305bb90ee901435fa20e8925a01c2d2d%2C31723e60ff684204bc5d65973657f021%2C3ad4e2778fe74dce86f6c9b39370f62e%2C3cbab5c436bb4e00a9fb2ac19ef19823%2C477069cf109347e9b720582dc24db4d7%2C4db36de831b8432692844e724f384176%2C565ffea456034cb89ebd5be83f8a8aed%2C590a2e5bda1b4a2ab07ed3cce7c6f4b9%2C591b0a73a8244c34966cfd039c48e6c2%2C5eb629c0c5704c1d822e37a3dc03692c%2C63c7530578dd4fe8861f0620619c20cc%2C6cc0cd1862bc4cec9777845adabcd2c7%2C6dbdd2fa51f6451d93fdf2ee401105f5%2C6f63023e41a64f41a463cb87ff083fca%2C702f9b5a1c014b79bb255b35606a2300%2C7e28f755b13b42c1a510344c4f303005%2C8de69718538b4263a695267badc012fe%2C8ef27eb954774014920a5652585fe2bc%2C9a28af09e29f4f518726db59a7d3cde1%2C9e1aafb2995f443a9167944c1f028007%2Ca8dce4fbeb304117af2ed093f35de3a7%2Caf6b8f536b664549b6a5e2510ae94afd%2Cb37286d6ef384ea4890fea004ab21b81%2Cb67c14289c424cf28dd0c5c880684bed%2Cc21a6dfc27b246009d49b56d08707af3%2Cc29a92af09bb4927a7433640f2fdacbd%2Ccb8edbb5620544dca947df686577825a%2Cccb0b324a6194b7ea2e4e7bc8d782417%2Ccea072eb04c94898a19c6842a6abb9fc%2Ccedb7e14bdc344e1a668f9952349ead6%2Cda8e685c0c124bda81254f4819e8b608%2Ce20734752d234dc4ac7a4337a7a9282f%2Ce4abb89b6eae43839e547d3984f5f9b0%2Cebcbe8c77c544c36974d7e7c9a0356a4%2Cec086f961b0148ad9b664efe0d95ee35%2Ced221e0e7120452bacca9fdc4355ad9a%2Cef5dec1a5ac145da921863e96a5163e4%2Cf2afb75547784c5a8445bdd9643d96be%2Cf902e51155f34cd29b9ee7d952d07d7b%2Cf959c6b0c5a141cca05faa21e3e8a3b0%2Cf9c8a1a42be040279cf8e4908ac268b8%2Cffcbb428b9bc4009a47063d15c819875',
        )
        self.auth_get(
            url='http://127.0.0.1:8080/api/contentnode?id__in=032166383a674a3392075fb1ec68fcd3%2C04d6fde0823146abbf5fdf8577c923f6%2C140f7ff8650e474f9855fc451c5404b3%2C1513757439de47f4a0cd6ae35874c915%2C276c36a7ef2e44b48b8eda87dc6b0bf8%2C28474df5260847bf86e9a6e2441aac15%2C29efdfd5db2845a18ea316fafba11b92%2C2f4014c81fef47aea3471793672765f8%2C305bb90ee901435fa20e8925a01c2d2d%2C31723e60ff684204bc5d65973657f021%2C3ad4e2778fe74dce86f6c9b39370f62e%2C3cbab5c436bb4e00a9fb2ac19ef19823%2C477069cf109347e9b720582dc24db4d7%2C4db36de831b8432692844e724f384176%2C565ffea456034cb89ebd5be83f8a8aed%2C590a2e5bda1b4a2ab07ed3cce7c6f4b9%2C591b0a73a8244c34966cfd039c48e6c2%2C5eb629c0c5704c1d822e37a3dc03692c%2C63c7530578dd4fe8861f0620619c20cc%2C6cc0cd1862bc4cec9777845adabcd2c7%2C6dbdd2fa51f6451d93fdf2ee401105f5%2C6f63023e41a64f41a463cb87ff083fca%2C702f9b5a1c014b79bb255b35606a2300%2C7e28f755b13b42c1a510344c4f303005%2C8de69718538b4263a695267badc012fe%2C8ef27eb954774014920a5652585fe2bc%2C9a28af09e29f4f518726db59a7d3cde1%2C9e1aafb2995f443a9167944c1f028007%2Ca8dce4fbeb304117af2ed093f35de3a7%2Caf6b8f536b664549b6a5e2510ae94afd%2Cb37286d6ef384ea4890fea004ab21b81%2Cb67c14289c424cf28dd0c5c880684bed%2Cc21a6dfc27b246009d49b56d08707af3%2Cc29a92af09bb4927a7433640f2fdacbd%2Ccb8edbb5620544dca947df686577825a%2Cccb0b324a6194b7ea2e4e7bc8d782417%2Ccea072eb04c94898a19c6842a6abb9fc%2Ccedb7e14bdc344e1a668f9952349ead6%2Cda8e685c0c124bda81254f4819e8b608%2Ce20734752d234dc4ac7a4337a7a9282f%2Ce4abb89b6eae43839e547d3984f5f9b0%2Cebcbe8c77c544c36974d7e7c9a0356a4%2Cec086f961b0148ad9b664efe0d95ee35%2Ced221e0e7120452bacca9fdc4355ad9a%2Cef5dec1a5ac145da921863e96a5163e4%2Cf2afb75547784c5a8445bdd9643d96be%2Cf902e51155f34cd29b9ee7d952d07d7b%2Cf959c6b0c5a141cca05faa21e3e8a3b0%2Cf9c8a1a42be040279cf8e4908ac268b8%2Cffcbb428b9bc4009a47063d15c819875',
        )


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
