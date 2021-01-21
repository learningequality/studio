from contentcuration.db.models.manager import CustomContentNodeTreeManager
from contentcuration.models import ContentNode
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase


class CustomContentNodeTreeManagerTest(StudioTestCase):
    def setUp(self):
        super(CustomContentNodeTreeManagerTest, self).setUp()
        self.manager = CustomContentNodeTreeManager()
        self.manager.model = ContentNode

    def test_mptt_refresh(self):
        node_a = testdata.node({"kind_id": "topic", "title": "Node A"})
        node_b = ContentNode(id="abc123", title="Node B")
        self.manager._mptt_refresh(node_a, node_b)
