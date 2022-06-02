from __future__ import absolute_import

from django.urls import reverse

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


class SearchViewsetTestCase(StudioAPITestCase):

    def test_filter_exclude_channels(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        channel = testdata.channel()
        channel.editors.add(user)
        response = self.client.get(
            reverse("search-list"), data={"exclude_channel": channel.id}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["results"], [])

    def test_filter_channels_by_edit(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        channel = testdata.channel()
        channel.editors.add(user)
        response = self.client.get(
            reverse("search-list"), data={"channel_list": "edit"}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertNotEqual(response.data["results"], [])

    def test_search_result(self):
        # Create two users
        user_a = testdata.user(email="a@a.com")
        user_b = testdata.user(email="b@b.com")

        # Create two channels with two editors
        test_tree_data = {
            "node_id": "00000000000000000000000000000000",
            "title": "Root topic node",
            "kind_id": "topic",
            "children": [
                {
                    "node_id": "00000000000000000000000000000001",
                    "title": "Kolibri video",
                    "kind_id": "video",
                },
            ]
        }

        channel_a = testdata.channel(name="user_a_channel", main_tree_data=test_tree_data)
        channel_a.editors.add(user_a)

        channel_b = testdata.channel(name="user_b_channel", create_main_tree=False)
        channel_b.editors.add(user_b)

        # Publish channel_a
        channel_a.main_tree.publishing = False
        channel_a.main_tree.changed = False
        channel_a.main_tree.published = True
        channel_a.main_tree.save()
        channel_a.public = True
        channel_a.save()

        # Import resources from channel_a to channel_b
        channel_a.main_tree.copy_to(channel_b.main_tree, batch_size=1)
        channel_b.main_tree.refresh_from_db()

        # Send request from user_b to the search endpoint
        self.client.force_authenticate(user=user_b)
        response = self.client.get(
            reverse("search-list"),
            data={
                "channel_list": "public",
                "keywords": "video"
            },
            format="json",
        )

        # Assert whether the location_ids are of accessible nodes or not
        kolibri_video_node = channel_b.main_tree.get_descendants().filter(title="Kolibri video").first()

        # The ids in location_ids should be of channel_b's ContentNode only
        self.assertEqual(len(response.data["results"][0]["location_ids"]), 1)
        self.assertEqual(response.data["results"][0]["location_ids"][0], kolibri_video_node.cloned_source_id)
