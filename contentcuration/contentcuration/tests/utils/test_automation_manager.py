import unittest

from contentcuration.utils.automation_manager import AutomationManager


class AutomationManagerTestCase(unittest.TestCase):
    def setUp(self):
        self.automation_manager = AutomationManager()

    def test_creation(self):
        # Check if an instance of AutomationManager is created successfully
        self.assertIsInstance(self.automation_manager, AutomationManager)
