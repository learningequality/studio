import json

import pytest
from base import BaseAPITestCase
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.urlresolvers import reverse_lazy
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from contentcuration.management.commands.exportchannel import create_associated_thumbnail
from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.nodes import map_files_to_node
from contentcuration.views.files import generate_thumbnail
from contentcuration.views.files import image_upload
from contentcuration.views.files import thumbnail_upload

pytestmark = pytest.mark.django_db


@pytest.fixture
def base64encoding():
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/" \
        "9hAAACk0lEQVR4AaWTA7TbbABA8/+zreMdzbYOZtu2bbt4rpPUtvlebbezbdvMvsxmG99740" \
        "CDF6z4p/G3RYkFLQPGmvj8mx30m7uo1LhNO6ou50r++zrkMoj/cRWUJmIz0gvEDXIVvP/Hbd" \
        "xRte+chaXe7gDDsP9WwqLJixicgqWwsNrncZFJ2UnmM+Xy1awlqDz/LVsKC6oDtxA0k/B1aD" \
        "Oi6rMBVVi2ys1Td+qd5NU8ZV0cWEKeWsZ4IKbdn3ikOJTogm9bw1PWw50twAWNFbS9oK1UlX" \
        "Y337KA6sxwiBb/NIJYM3KrRNOSppD1YNtM9wwHUs+S188M38hXtCKKNSOAM4PmzKCgWQhaNU" \
        "SiGCIE1DKGYozyJc5EW47ZZ2Ka3U0oNieTbLNjruOHsCO3LvNgq6cZznAHuAICah5DohjDUEG" \
        "+OciQRsbQlFGKUOvrw9d6uSiiKcu3h9S86F7Me/oMtv/yFVsofaQCYHyhxtcLuFSGNDwatCGI" \
        "SrZE6EzXIJYkoqILPR0k2oCMo/b1EOpcQqEnjkXPnseOX71uEuqDvQCTAqfjW5fhGkQlWyMQf" \
        "acZYRHs61jc4HKOJAGXBE+1F1vjdRiwegEstrywB9OYK5zdITZH6xUHTnUADgLcpaBZD1omxCY" \
        "5m6K7HRaEUDxDZjoyWOs9Xwu/43lbWTUKSfwwzNGfROX2hvg2wGrLjEcGIwTHTHR3sQW0jSEcIN" \
        "tsnembjYu2z0fKfngHaEXm2jzYmXaUHL7k3H+z6YftOxagZXEXNJ2+eJV3zGF/8RZyWZ6RakH8ad" \
        "Z9AksmLmz6nO2cy/3vl9+CnJdYZJRmn+x1HsOOh07BkcTF0p/z39hBuoJNuW9U2nF01rngydo/+xr" \
        "/aXwDY2vpQfdHLrIAAAAASUVORK5CYII="


@pytest.fixture
def generated_base64encoding():
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAA"\
        "C8klEQVR4nKWTSWhVZxiGv/N//3+Ge+49d8gdkphYOyxMGm+p1QQSm40KIgqKoKUuKu0idFMIWRWKC7"\
        "G4sqEDxZUEQciwMsaEihsV0ThAojYmahK8NjXJzXCH3DP955zfRUkWIljwW368z7t6H+nA953wPkf/b"\
        "/DY/q0MACIAUO4bnuTrfwIAwH0X9UTM+OSL7dKb4KFPU9Kh9g8ahBDtAKC8WqO+Ho8ZrucgAIAkhJC6"\
        "zl047vju54js1MzD8eI6vHtfS0va0I44+bmX3DMvXL45V/wom435vndSQfnB04djF6WfzvXt9aXgBxb"\
        "RB6iqNpZWV36ZvD+62PH1gSqf0SEvpGY5wp6Lf/TebtjRkonEE53ctie8cuUoCtJNiAMdOgsPVyU3fUm"\
        "Z/CTOcNf21tbs7D/zjYvLhUaUCP04lc5kdzZ/FmfYSpk8lUpuatNZeJg40EE0IddIHJaE6WC9oj1Kx5Lf"\
        "ZKJxHhipr1aAGWElJEdQOVifTnupWPJEvaKNB6YjS1zkNaHUEtlDP6ongNhQ8ktmFboiT/9dnTYkLZWK"\
        "1wLSEHBHqm6qrp1BVyz7RTNObChF9YSQPSII9SQURdOkXNSU14ICA9RIItlCLNtEywaVIKgEvelcvpUB"\
        "yuVKUKZcVIuCZVGPEEpc8QgLvAkU/7aqhL9Np5PdC6X8i9LL3ChW7OMFRmmFkDFC6eNUNPOrbS19xx3n"\
        "Fhb5NvCDMaIw9TcU0i6yYBZDhnGl7LHZ/it9eevVUq81lx99MZWbnsnN9/SPDCys+Ww2FDGGyEJlDQVpU5"\
        "j6OxnMjUwIHvzMLTv0bOT61Z6B7mUAACVeh9FYnbpl81btw6ZmDQCgZ6B76flfN65yy9EE908P5kYmKQDA0"\
        "OK1Ozu9htH7dEqsjyik6O0RVW/KIFM8yzoMABMAAPdg0m1exD/v4t9iY8oAAPfokw34v4JwjcxkQYIAYq5b9"\
        "+OJrg1v1uF3yITnGcV5zxcxRYhLZ3rOem9LSe+r82vB1kP1vFwEDQAAAABJRU5ErkJggg=="


class FileThumbnailTestCase(BaseAPITestCase):

    def setUp(self):
        super(FileThumbnailTestCase, self).setUp()
        self.thumbnail_fobj = create_thumbnail_from_base64(base64encoding())
        filepath = generate_object_storage_name(self.thumbnail_fobj.checksum, str(self.thumbnail_fobj))
        with default_storage.open(filepath, 'rb') as fobj:
            self.thumbnail_contents = fobj.read()

    def test_get_thumbnail_encoding(self):
        encoding = get_thumbnail_encoding(str(self.thumbnail_fobj))
        self.assertEqual(encoding, generated_base64encoding())

    def test_channel_thumbnail_upload(self):
        upload_file = SimpleUploadedFile("image.png", self.thumbnail_contents)
        request = self.create_post_request(reverse_lazy('image_upload'), {'file': upload_file})
        file_response = image_upload(request)
        self.assertEqual(file_response.status_code, 200)
        file_data = json.loads(file_response.content)
        self.assertEqual(file_data['encoding'], generated_base64encoding())

    def test_node_thumbnail_upload(self):
        upload_file = SimpleUploadedFile("image.png", self.thumbnail_contents)
        request = self.create_post_request(reverse_lazy('image_upload'), {'file': upload_file})
        file_response = thumbnail_upload(request)
        self.assertEqual(file_response.status_code, 200)
        file_data = json.loads(file_response.content)
        self.assertEqual(file_data['encoding'], generated_base64encoding())

    def test_generate_thumbnail(self):
        # Create exercise node (generated images are more predictable)
        node = ContentNode(title="Test Node", kind_id=content_kinds.EXERCISE)
        node.save()

        # Create assessment item with image
        assessment_item = AssessmentItem(contentnode=node)
        assessment_item.save()
        self.thumbnail_fobj.assessment_item = assessment_item
        self.thumbnail_fobj.preset_id = format_presets.EXERCISE_IMAGE
        self.thumbnail_fobj.save()

        # Call generate_thumbnail endpoint
        request = self.create_post_request(reverse_lazy('generate_thumbnail', kwargs={'contentnode_id': node.pk}))
        response = generate_thumbnail(request, node.pk)
        self.assertEqual(response.status_code, 200)
        file_data = json.loads(response.content)
        self.assertEqual(file_data['encoding'], generated_base64encoding())

    def test_internal_thumbnail(self):
        # Create exercise node (generated images are more predictable)
        node = ContentNode(title="Test Node", kind_id=content_kinds.VIDEO)
        node.save()

        file_data = [{
            "preset": None,
            "filename": str(self.thumbnail_fobj),
            "language": "en",
            "size": self.thumbnail_fobj.file_size,
        }]
        map_files_to_node(self.user, node, file_data)
        self.assertTrue(isinstance(node.thumbnail_encoding, basestring))
        thumbnail_data = json.loads(node.thumbnail_encoding)
        self.assertEqual(thumbnail_data['base64'], generated_base64encoding())

    def test_exportchannel_thumbnail(self):
        node = ContentNode(title="Test Node", kind_id=content_kinds.VIDEO)
        node.save()
        newfile = create_associated_thumbnail(node, self.thumbnail_fobj)
        self.assertTrue(isinstance(newfile, File))
        thumbnail_data = json.loads(node.thumbnail_encoding)
        self.assertEqual(thumbnail_data['base64'], generated_base64encoding())
