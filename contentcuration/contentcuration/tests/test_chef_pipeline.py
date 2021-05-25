from __future__ import absolute_import

import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from .base import BaseAPITestCase
from .testdata import create_test_file
from .testdata import invalid_file_json
from .testdata import node_json
from .testdata import user
from contentcuration import models as cc


channel_metadata = {
    "id": "aronasaurusrex",  # why is ID a required field for this call?
    "name": "Aron's cool channel",
    "description": "coolest channel this side of the Pacific",
    "thumbnail": ":)",
}


class EndpointNamesTestCase(BaseAPITestCase):
    """
    Make sure the API endpoints defined in Ricecooker are the the expected ones.
    """

    # checks
    assert "/api/internal/authenticate_user_internal" == reverse(
        "authenticate_user_internal"
    )
    assert "/api/internal/check_version" == reverse("check_version")
    # File upload
    assert "/api/internal/file_diff" == reverse("file_diff")
    assert "/api/internal/file_upload" == reverse("api_file_upload")
    # Metadata upload
    assert "/api/internal/create_channel" == reverse("api_create_channel")
    assert "/api/internal/add_nodes" == reverse("api_add_nodes_to_tree")
    assert "/api/internal/finish_channel" == reverse("api_finish_channel")
    # Publish (optional)
    assert "/api/internal/publish_channel" == reverse("api_publish_channel")


class ChefTestCase(BaseAPITestCase):
    """
    Exercises all the Ricecooker endpoints with fake data.
    """

    def setUp(self):
        super(ChefTestCase, self).setUp()
        # BaseAPITestCase.setUp calls client.force_authenticate(user), but we do
        # not want that for this test case since Ricecooker uses Token-only auth.
        self.client.force_authenticate(user=None)
        # To set the header 'Authorization' in the HTTP request made by the API
        # client, we must pass HTTP_AUTHORIZATION keyword to `client.credentials`
        self.client.credentials(HTTP_AUTHORIZATION="Token {0}".format(self.token))
        # these token credentials will be presisted for all tests...
        #
        self.authenticate_user_internal_url = reverse("authenticate_user_internal")
        self.check_version_url = reverse("check_version")
        self.file_diff_url = reverse("file_diff")
        self.file_upload_url = reverse("api_file_upload")
        self.create_channel_url = reverse("api_create_channel")
        self.add_nodes_url = reverse("api_add_nodes_to_tree")
        self.finish_channel_url = reverse("api_finish_channel")

    def test_authenticate_user_internal_bad_token(self):
        # clear previously set credentials good credentials
        self.client.credentials()
        badtoken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        self.client.credentials(HTTP_AUTHORIZATION="Token {0}".format(badtoken))
        response = self.post(self.authenticate_user_internal_url, None)
        assert response.status_code == 401
        # restore good credentials so rest of tests in this class will be OK
        self.client.credentials(HTTP_AUTHORIZATION="Token {0}".format(self.token))

    def test_authenticate_user_internal_no_token(self):
        # clear previously set credentials good credentials
        self.client.credentials()
        response = self.post(self.authenticate_user_internal_url, None)
        assert response.status_code == 401
        # restore good credentials so rest of tests in this class will be OK
        self.client.credentials(HTTP_AUTHORIZATION="Token {0}".format(self.token))

    def test_authenticate_user_internal(self):
        # No need to set headers since the Authorization Token was added in setUp
        response = self.post(self.authenticate_user_internal_url, None)
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["success"] == True
        assert data["username"] == user().email

    def test_check_version_bad_request(self):
        response = self.post(self.check_version_url, {})
        assert response.status_code == 500

    def test_check_version(self):
        response = self.post(self.check_version_url, data={"version": "1000"})
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["status"] == 0

        # TODO: Add tests for the soft and hard warning versions
        response = self.post(self.check_version_url, data={"version": "0"})
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["status"] == 3

    def test_file_upload_bad_request(self):
        response = self.post(self.file_upload_url, {})
        assert response.status_code == 400

    def test_file_upload_no_data(self):
        f = SimpleUploadedFile("myfile.txt", None)
        response = self.post(self.file_upload_url, {"file": f}, format="multipart")
        assert response.status_code == 400

    def test_file_upload_bad_hash(self):
        file_data = create_test_file(b"Just some data.")
        f = SimpleUploadedFile("myfile.txt", file_data["data"])
        response = self.post(self.file_upload_url, {"file": f}, format="multipart")
        # shoulf fail because api_file_upload calls write_file_to_storage with check_valid=True
        assert response.status_code == 400

    def test_file_upload(self):
        file_data = create_test_file(b"Just some data.")
        f = SimpleUploadedFile(file_data["name"], file_data["data"])
        response = self.post(self.file_upload_url, {"file": f}, format="multipart")
        # TODO: check file content saved to storage
        assert response.status_code == 200, "Call failed:\n output: {}".format(
            response.content
        )

    def test_create_channel_bad_request(self):
        response = self.post(self.create_channel_url, {})
        assert response.status_code == 400

    def test_create_channel(self):
        response = self.post(
            self.create_channel_url, {"channel_data": channel_metadata}
        )
        # FIXME: we aren't returning the proper REST HTTP status for creating a new item
        assert response.status_code == 200, "Call failed:\n output: {}".format(
            response.content
        )

    def test_add_nodes_bad_request(self):
        response = self.post(self.add_nodes_url, {})
        assert response.status_code == 400

    def test_add_nodes_invalid_file(self):
        response = self.post(
            self.create_channel_url, {"channel_data": channel_metadata}
        )
        assert response.status_code == 200
        data = json.loads(response.content)
        assert "root" in data

        invalid_file_json[0]["license"] = cc.License.objects.all()[0].license_name

        # Ensure that sending a node with an invalid file reference returns a 500 error
        response = self.post(
            self.add_nodes_url,
            {"root_id": data["root"], "content_data": invalid_file_json},
        )
        assert response.status_code == 500

    def test_add_nodes(self):
        response = self.post(
            self.create_channel_url, {"channel_data": channel_metadata}
        )
        assert response.status_code == 200
        data = json.loads(response.content)
        assert "root" in data

        node_data = node_json(
            {"kind": "topic", "license": cc.License.objects.all()[0].license_name}
        )
        response = self.post(
            self.add_nodes_url, {"root_id": data["root"], "content_data": [node_data]}
        )
        assert response.status_code == 200, "Call failed:\n output: {}".format(
            response.content
        )

    def test_finish_channel_bad_request(self):
        response = self.post(self.finish_channel_url, {})
        assert response.status_code == 400

    def test_finish_channel(self):
        response = self.post(
            self.create_channel_url, {"channel_data": channel_metadata}
        )
        assert response.status_code == 200
        data = json.loads(response.content)
        assert "root" in data
        assert "channel_id" in data

        node_data = node_json(
            {"kind": "topic", "license": cc.License.objects.all()[0].license_name}
        )
        response = self.post(
            self.add_nodes_url, {"root_id": data["root"], "content_data": [node_data]}
        )
        assert response.status_code == 200, "Call failed:\n output: {}".format(
            response.content
        )

        response = self.post(
            self.finish_channel_url, {"channel_id": data["channel_id"]}
        )
        assert response.status_code == 200
