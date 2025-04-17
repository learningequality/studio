from django.urls import reverse

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.utils.publish import sync_contentnode_and_channel_tsvectors


def dummy_publish(channel):
    channel_nodes = ContentNode.objects.filter(tree_id=channel.main_tree.tree_id)
    for node in channel_nodes:
        node.published = True
        node.changed = False
        node.save()
    sync_contentnode_and_channel_tsvectors(channel_id=channel.id)


class SearchViewsetTestCase(StudioAPITestCase):
    def setUp(self):
        super().setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        dummy_publish(self.channel)

    def test_filter_exclude_channels(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            reverse("search-list"), data={"exclude_channel": self.channel.id}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["results"], [])

    def test_filter_channels_by_edit(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            reverse("search-list"), data={"channel_list": "edit"}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertNotEqual(response.data["results"], [])

    def test_search(self):
        users = []
        channels = []

        # Create channels, users.
        for i in range(4):
            user = testdata.user(email="a{}@a.com".format(i))
            users.append(user)

            channel = Channel.objects.create(actor_id=user.id, name="user_a{}_channel".format(i))
            channel.save()
            channels.append(channel)
            channel.editors.add(user)

        public_channel, editable_channel, viewable_channel, inaccessible_channel = channels

        # Create public video node.
        public_video_node = testdata.node({
            "title": "Kolibri video",
            "kind_id": "video",
        }, parent=public_channel.main_tree)
        public_channel.public = True
        public_channel.save()

        # Set user_b viewable channel.
        user_b = users[1]
        viewable_channel.viewers.add(user_b)

        public_video_node.refresh_from_db()
        public_video_node.copy_to(target=editable_channel.main_tree)
        public_video_node.copy_to(target=viewable_channel.main_tree)
        public_video_node.copy_to(target=inaccessible_channel.main_tree)

        # Publish all channels to make them searchable.
        for channel in channels:
            dummy_publish(channel)

        # Get different nodes based on access.
        editable_channel.main_tree.refresh_from_db()
        editable_video_node = editable_channel.main_tree.get_descendants().first()
        viewable_channel.main_tree.refresh_from_db()
        viewable_video_node = viewable_channel.main_tree.get_descendants().first()
        inaccessible_channel.main_tree.refresh_from_db()
        inaccessible_video_node = inaccessible_channel.main_tree.get_descendants().first()

        # Send request from user_b to the search endpoint.
        self.client.force_authenticate(user=user_b)

        for channel_list in ("public", "edit", "view"):
            response = self.client.get(
                reverse("search-list"),
                data={
                    "channel_list": channel_list,
                    "keywords": "video"
                },
                format="json",
            )

            result = response.data["results"][0]

            self.assertNotEqual(result["id"], inaccessible_video_node.id)

            if channel_list == "public":
                self.assertEqual(result["id"], public_video_node.id)
            elif channel_list == "edit":
                self.assertEqual(result["id"], editable_video_node.id)
            elif channel_list == "view":
                self.assertEqual(result["id"], viewable_video_node.id)
