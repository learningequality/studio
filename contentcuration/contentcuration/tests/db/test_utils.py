from django.db.utils import ProgrammingError

from ..base import TemporaryModelTestCase as BaseTemporaryModelTestCase
from contentcuration.db.utils import temporary_model


class TemporaryModelTestCase(BaseTemporaryModelTestCase):
    def test_create(self):
        with temporary_model(self.TempModel):
            created_item = self.TempModel.objects.create(name='Test')
            get_item = self.TempModel.objects.get(name='Test')

            self.assertEqual(created_item.pk, get_item.pk)

    def test_only_temporary(self):
        with temporary_model(self.TempModel):
            self.TempModel.objects.create(name='Test')

        self.assertRaises(ProgrammingError, self.TempModel.objects.get, name='Test')
