import os
import tempfile
import zipfile

from .base import StudioTestCase


class ZipFileTestCase(StudioTestCase):

    def setUp(self):
        super(ZipFileTestCase, self).setUpBase()
        self.zipfile_url = '/zipcontent/'

        self.temp_files = []

    def tearDown(self):
        for temp_file in self.temp_files:
            os.remove(temp_file)

    def do_create_zip(self):
        zip_handle, zip_filename = tempfile.mkstemp(suffix='.zip')
        self.temp_files.append(zip_filename)
        os.close(zip_handle)

        with zipfile.ZipFile(zip_filename, 'w') as zip:
            zip.writestr("index.html", "<html><head></head><body><p>Hello World!</p></body></html>")

        return zip_filename

    def test_invalid_zip(self):
        temp_file, response = self.upload_temp_file(b"Hello!", ext="zip")
        url = '{}{}/'.format(self.zipfile_url, temp_file['name'])
        response = self.get(url)
        assert response.status_code == 500

    def test_valid_zipfile(self):
        myzip = self.do_create_zip()

        self.sign_in()
        temp_file, response = self.upload_temp_file(open(myzip, 'rb').read(), preset='html5_zip', ext='zip')
        assert response.status_code == 200
        url = '{}{}/'.format(self.zipfile_url, temp_file['name'])
        response = self.get(url)
        assert response.status_code == 200

    def test_valid_zipfile_file_access(self):
        myzip = self.do_create_zip()

        self.sign_in()
        temp_file, response = self.upload_temp_file(open(myzip, 'rb').read(), preset='html5_zip', ext='zip')
        assert response.status_code == 200
        url = '{}{}/index.html'.format(self.zipfile_url, temp_file['name'])
        response = self.get(url)
        assert response.status_code == 200

    def test_valid_zipfile_missing_file(self):
        myzip = self.do_create_zip()

        self.sign_in()
        temp_file, response = self.upload_temp_file(open(myzip, 'rb').read(), preset='html5_zip', ext='zip')
        assert response.status_code == 200
        url = '{}{}/iamjustanillusion.txt'.format(self.zipfile_url, temp_file['name'])
        response = self.get(url)
        assert response.status_code == 404

    def test_valid_zipfile_access_outside_zip_fails(self):
        myzip = self.do_create_zip()

        self.sign_in()
        temp_file, response = self.upload_temp_file(open(myzip, 'rb').read(), preset='html5_zip', ext='zip')
        assert response.status_code == 200
        url = '{}{}/../outsidejson.js'.format(self.zipfile_url, temp_file['name'])
        response = self.get(url)
        assert response.status_code == 404
