#!/usr/bin/env python
import os

from locust import HttpLocust, TaskSet, task

USERNAME = os.getenv("LOCUST_USERNAME") or "a@a.com"
PASSWORD = os.getenv("LOCUST_PASSWORD") or "a"


class BaseTaskSet(TaskSet):

    def _login(self):
        """
        Helper functoin to log in the user to the current session.
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


    def i18n_requests(self):
        self.client.get("/jsi18n/")
        self.client.get("/jsreverse/")

class ChannelListPage(BaseTaskSet):

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
        resp = self.client.get("/channels/")
        self.channel_list_api_calls()

class LoginPage(BaseTaskSet):
    tasks = [ChannelListPage]

    @task
    def loginpage(self):
        """
        Visit the login page and the i18n endpoints without logging in.
        """
        self.client.get("/accounts/login/")
        self.i18n_requests()


class StudioDesktopBrowserUser(HttpLocust):
    task_set = LoginPage
    min_wait = 5000
    max_wait = 20000
