import json

from django.core.files.uploadedfile import SimpleUploadedFile

from contentcuration import ricecooker_versions as rc
from contentcuration import models as cc

from base import BaseAPITestCase
from testdata import create_temp_file, invalid_file_json, node_json


channel_metadata = {
    "id": "aronasaurusrex",  # why is ID a required field for this call?
    "name": "Aron's cool channel",
    "description": "coolest channel this side of the Pacific",
    "thumbnail": ":)"
}


class ChefTestCase(BaseAPITestCase):
    def setUp(self):
        super(ChefTestCase, self).setUp()
        self.check_version_url = '/api/internal/check_version'
        self.create_channel_url = '/api/internal/create_channel'
        self.add_nodes_url = '/api/internal/add_nodes'
        self.file_upload_url = '/api/internal/file_upload'
        self.finish_channel_url = '/api/internal/finish_channel'

    def test_check_version_bad_request(self):
        response = self.post(self.check_version_url, {})
        assert response.status_code == 500

    def test_check_version(self):
        response = self.post(self.check_version_url, data={'version': '1000'})
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data['status'] == 0

        # TODO: Add tests for the soft and hard warning versions
        response = self.post(self.check_version_url, data={'version': '0'})
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data['status'] == 3

    def test_file_upload_bad_request(self):
        response = self.post(self.file_upload_url, {})
        assert response.status_code == 400

    def test_file_upload_no_data(self):
        f = SimpleUploadedFile("myfile.txt", None)
        response = self.post(self.file_upload_url, {'file': f}, format='multipart')
        assert response.status_code == 500

    def test_file_upload_bad_hash(self):
        file_data = create_temp_file("Just some data.")
        f = SimpleUploadedFile("myfile.txt", file_data['data'])
        response = self.post(self.file_upload_url, {'file': f}, format='multipart')
        assert response.status_code == 500

    def test_file_upload(self):
        file_data = create_temp_file("Just some data.")
        f = SimpleUploadedFile(file_data['name'], file_data['data'])
        response = self.post(self.file_upload_url, {'file': f}, format='multipart')
        assert response.status_code == 200, "Call failed:\n output: {}".format(response.content)

    def test_create_channel_bad_request(self):
        response = self.post(self.create_channel_url, {})
        assert response.status_code == 400

    def test_create_channel(self):
        response = self.post(self.create_channel_url, {'channel_data': channel_metadata})
        # FIXME: we aren't returning the proper REST HTTP status for creating a new item
        assert response.status_code == 200, "Call failed:\n output: {}".format(response.content)

    def test_add_nodes_bad_request(self):
        response = self.post(self.add_nodes_url, {})
        assert response.status_code == 400

    def test_add_nodes_invalid_file(self):
        response = self.post(self.create_channel_url, {'channel_data': channel_metadata})
        assert response.status_code == 200
        data = json.loads(response.content)
        assert 'root' in data

        invalid_file_json[0]['license'] = cc.License.objects.all()[0].license_name

        # Ensure that sending a node with an invalid file reference returns a 500 error
        response = self.post(self.add_nodes_url, {'root_id': data['root'], 'content_data': invalid_file_json})
        assert response.status_code == 500

    def test_add_nodes(self):
        response = self.post(self.create_channel_url, {'channel_data': channel_metadata})
        assert response.status_code == 200
        data = json.loads(response.content)
        assert 'root' in data

        node_data = node_json({'kind':'topic', 'license':cc.License.objects.all()[0].license_name})
        response = self.post(self.add_nodes_url, {'root_id': data['root'], 'content_data': [node_data]})
        assert response.status_code == 200, "Call failed:\n output: {}".format(response.content)

    def test_finish_channel_bad_request(self):
        response = self.post(self.finish_channel_url, {})
        assert response.status_code == 400

    def test_finish_channel(self):
        response = self.post(self.create_channel_url, {'channel_data': channel_metadata})
        assert response.status_code == 200
        data = json.loads(response.content)
        assert 'root' in data
        assert 'channel_id' in data

        node_data = node_json({'kind':'topic', 'license':cc.License.objects.all()[0].license_name})
        response = self.post(self.add_nodes_url, {'root_id': data['root'], 'content_data': [node_data]})
        assert response.status_code == 200, "Call failed:\n output: {}".format(response.content)

        response = self.post(self.finish_channel_url, {'channel_id': data['channel_id']})
        assert response.status_code == 200
