from io import BytesIO

from base import StudioTestCase
from django.core.urlresolvers import reverse

from contentcuration.models import AssessmentItem
from contentcuration.models import File


class ExerciseImageUploadTestCase(StudioTestCase):

    def test_post_exercise_image(self):
        File.objects.all().delete()
        img = BytesIO(b'mybinarydata')
        img.name = 'myimage.jpg'
        self.client.post(reverse('exercise_image_upload'), {0: img})
        self.assertEqual(File.objects.all().count(), 1)

    def test_post_exercise_image_assessment_item_id(self):
        File.objects.all().delete()
        item = AssessmentItem.objects.create()
        img = BytesIO(b'mybinarydata')
        img.name = 'myimage.jpg'
        self.client.post(reverse('exercise_image_upload'), {0: img, 'assessment_item_id': item.id})
        self.assertEqual(File.objects.get().assessment_item, item)
