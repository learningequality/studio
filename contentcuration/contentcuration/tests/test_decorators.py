import mock

from contentcuration.decorators import delay_user_storage_calculation
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.base import testdata
from contentcuration.utils.user import calculate_user_storage


class DecoratorsTestCase(StudioTestCase):
    def setUp(self):
        super(DecoratorsTestCase, self).setUp()
        self.user = testdata.user()

    @mock.patch("contentcuration.utils.user.calculate_user_storage_task")
    def test_delay_storage_calculation(self, mock_task):
        @delay_user_storage_calculation
        def do_test():
            calculate_user_storage(self.user.id)
            calculate_user_storage(self.user.id)
            mock_task.fetch_or_enqueue.assert_not_called()

        do_test()
        mock_task.fetch_or_enqueue.assert_called_once_with(
            self.user, user_id=self.user.id
        )
