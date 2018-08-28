import datetime

from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.management import call_command

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

import contentcuration.models as models
from contentcuration.tests import testdata
from contentcuration.tests.base import BucketTestMixin
from contentcuration.utils.policies import get_latest_policies


class LiveServerBaseTestCase(StaticLiveServerTestCase, BucketTestMixin):
    @classmethod
    def setUpClass(cls):
        super(LiveServerBaseTestCase, cls).setUpClass()
        call_command('loadconstants')

    def setUp(self):
        if not self.persist_bucket:
            self.create_bucket()

    def tearDown(self):
        if not self.persist_bucket:
            self.delete_bucket()

    def agree_policies(self, user):
        # We agree to #allthethings, so let us in!
        for policy in get_latest_policies():
            user.policies = {policy: datetime.datetime.now().strftime("%d/%m/%y %H:%M")}
        user.save()

    def wait_for_element_id(self, element_id, timeout=5):
        WebDriverWait(self.selenium, timeout).until(
            EC.presence_of_element_located((By.ID, element_id)))


class AccountTestCase(LiveServerBaseTestCase):
    def setUp(self):
        self.user = testdata.user()
        self.user.is_active = True
        self.user.save()
        self.selenium = webdriver.Firefox()
        super(AccountTestCase, self).setUp()

    def tearDown(self):
        self.selenium.quit()
        super(AccountTestCase, self).tearDown()

    def test_signin(self):
        user = models.User.objects.get(email=self.user.email)
        self.agree_policies(user)
        assert user.check_password('password') == True
        selenium = self.selenium
        #Opening the link we want to test
        selenium.get(self.live_server_url)

        self.wait_for_element_id('id_username')
        username = selenium.find_element_by_id('id_username')
        assert username
        username.send_keys(self.user.email)
        assert username.get_attribute("value") == self.user.email

        password = selenium.find_element_by_id('id_password')
        assert password
        password.send_keys('password')
        assert password.get_attribute("value") == 'password'

        submit = selenium.find_element_by_xpath("//input[@type='submit']")
        assert submit
        submit.click()

        self.wait_for_element_id('channel-container')
        assert selenium.find_element_by_id('channel-container')
        assert 'My Channels' in selenium.page_source
