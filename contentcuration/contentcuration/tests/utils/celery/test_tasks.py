import mock
from django.test import SimpleTestCase

from contentcuration.utils.celery.tasks import ProgressTracker


class ProgressTrackerTestCase(SimpleTestCase):
    def setUp(self):
        super(ProgressTrackerTestCase, self).setUp()
        self.send_event = mock.Mock()
        self.tracker = ProgressTracker("abc123", self.send_event)

    def test_set_total(self):
        self.assertEqual(100, self.tracker.total)
        self.tracker.set_total(200)
        self.assertEqual(200, self.tracker.total)

    def test_increment(self):
        with mock.patch(
            "contentcuration.utils.celery.tasks.ProgressTracker.track"
        ) as track:
            self.tracker.increment()
            track.assert_called_with(1.0)
            self.tracker.progress = 1
            self.tracker.increment(increment=2.0)
            track.assert_called_with(3.0)

    def test_task_progress(self):
        self.assertEqual(0, self.tracker.task_progress)
        self.tracker.progress = 50
        self.assertEqual(50, self.tracker.task_progress)
        self.tracker.total = 200
        self.assertEqual(25, self.tracker.task_progress)

    def test_track(self):
        self.tracker.track(2)
        self.assertEqual(2, self.tracker.progress)
        self.send_event.assert_called_with(progress=2)

    def test_track__small_increment(self):
        self.tracker.track(0.5)
        self.assertEqual(0.5, self.tracker.progress)
        self.send_event.assert_not_called()
        self.tracker.track(1.0)
        self.send_event.assert_called_with(progress=1)
