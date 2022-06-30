from __future__ import absolute_import

from django.urls import reverse

from contentcuration.models import Channel
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

    def test_channel_list_filter_and_location_ids(self):
        users = []
        channels = []
        for i in range(4):
            user = testdata.user(email="a{}@a.com".format(i))
            users.append(user)
            channel = Channel.objects.create(name="user_a{}_channel".format(i))
            channel.save()
            channels.append(channel)
            channel.editors.add(user)

        public_channel, editable_channel, viewable_channel, inaccessible_channel = channels

        public_video_node = testdata.node({
            "title": "Kolibri video",
            "kind_id": "video",
        }, parent=public_channel.main_tree)
        public_video_node.complete = True
        public_video_node.published = True
        public_video_node.changed = False
        public_video_node.save()

        public_channel.main_tree.published = True
        public_channel.main_tree.changed = False
        public_channel.main_tree.save()

        public_channel.public = True
        public_channel.save()

        user_b = users[1]
        viewable_channel.viewers.add(user_b)

        public_video_node.refresh_from_db()
        public_video_node.copy_to(target=editable_channel.main_tree)
        public_video_node.copy_to(target=viewable_channel.main_tree)
        public_video_node.copy_to(target=inaccessible_channel.main_tree)

        editable_channel.main_tree.refresh_from_db()
        editable_video_node = editable_channel.main_tree.get_descendants().first()
        viewable_channel.main_tree.refresh_from_db()
        viewable_video_node = viewable_channel.main_tree.get_descendants().first()
        inaccessible_channel.main_tree.refresh_from_db()
        inaccessible_video_node = inaccessible_channel.main_tree.get_descendants().first()

        # Send request from user_b to the search endpoint
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

            for result in response.data["results"]:
                self.assertNotEqual(result["id"], inaccessible_video_node.id)

                if channel_list == "public":
                    self.assertEqual(result["id"], public_video_node.id)
                elif channel_list == "edit":
                    self.assertEqual(result["id"], editable_video_node.id)
                elif channel_list == "view":
                    self.assertEqual(result["id"], viewable_video_node.id)

                location_ids = result["location_ids"]
                self.assertEqual(len(location_ids), 3)
                self.assertIn(editable_video_node.id, location_ids)
                self.assertIn(viewable_video_node.id, location_ids)
                self.assertIn(public_video_node.id, location_ids)
                self.assertNotIn(inaccessible_video_node.id, location_ids)
