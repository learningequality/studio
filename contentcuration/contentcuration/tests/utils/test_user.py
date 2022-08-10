import mock

from contentcuration.tests.base import StudioTestCase
from contentcuration.utils.user import calculate_user_storage
from contentcuration.utils.user import delay_user_storage_calculation


class UserUtilsTestCase(StudioTestCase):
    @mock.patch("contentcuration.utils.user.calculate_user_storage_task")
    def test_delay_storage_calculation(self, mock_task):
        @delay_user_storage_calculation
        def do_test():
            calculate_user_storage(self.admin_user.id)
            calculate_user_storage(self.admin_user.id)
            mock_task.fetch_or_enqueue.assert_not_called()

        do_test()
        mock_task.fetch_or_enqueue.assert_called_once_with(self.admin_user, user_id=self.admin_user.id)
