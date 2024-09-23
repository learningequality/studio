# DELETE THIS FILE AFTER RUNNING THE MIGRATIONSSS
import datetime
import uuid

from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from django_cte import With
from le_utils.constants import content_kinds

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import License
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.utils.publish import publish_channel


class TestRectifyMigrationCommand(StudioAPITestCase):

    @classmethod
    def setUpClass(cls):
        super(TestRectifyMigrationCommand, cls).setUpClass()

    def tearDown(self):
        super(TestRectifyMigrationCommand, self).tearDown()

    def setUp(self):
        super(TestRectifyMigrationCommand, self).setUp()
        self.original_channel = testdata.channel()
        self.license_original = License.objects.all()[0]
        self.original_contentnode = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="Original Node",
            parent=self.original_channel.main_tree,
            license=self.license_original,
            original_channel_id=None,
            source_channel_id=None,
            author="old author hehehe"
        )
        self.user = testdata.user()
        self.original_channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)

    def run_migrations(self):
        filter_date = datetime.datetime(2023, 7, 9, tzinfo=timezone.utc)
        main_trees_cte = With(
            (
                Channel.objects.filter(
                     main_tree__isnull=False
                )
                .annotate(channel_id=F("id"))
                .values("channel_id", "deleted", tree_id=F("main_tree__tree_id"))
            ),
            name="main_trees",
        )

        nodes = main_trees_cte.join(
            ContentNode.objects.all(),
            tree_id=main_trees_cte.col.tree_id,
        ).annotate(channel_id=main_trees_cte.col.channel_id, deleted=main_trees_cte.col.deleted)

        original_source_nodes = (
            nodes.with_cte(main_trees_cte)
            .filter(
                node_id=OuterRef("original_source_node_id"),
            )
            .exclude(
                tree_id=OuterRef("tree_id"),
            )
            .annotate(
                coalesced_provider=Coalesce("provider", Value("")),
                coalesced_author=Coalesce("author", Value("")),
                coalesced_aggregator=Coalesce("aggregator", Value("")),
                coalesced_license_id=Coalesce("license_id", -1),
            )
        )
        # We filter out according to last_modified date before this PR
        # https://github.com/learningequality/studio/pull/4189
        # As we want to lossen up the public=True Filter and open the
        # migration for all the nodes even if they are not published
        diff = (
            nodes.with_cte(main_trees_cte).filter(
                deleted=False,  # we dont want the channel to be deleted or else we are fixing ghost nodes
                source_node_id__isnull=False,
                original_source_node_id__isnull=False,
                modified__lt=filter_date
                # published=True,
            )
        ).annotate(
            coalesced_provider=Coalesce("provider", Value("")),
            coalesced_author=Coalesce("author", Value("")),
            coalesced_aggregator=Coalesce("aggregator", Value("")),
            coalesced_license_id=Coalesce("license_id", -1),
        )

        print(diff)

        diff_combined = diff.annotate(
            original_source_node_f_changed=Exists(
                original_source_nodes.filter(
                    ~Q(coalesced_provider=OuterRef("coalesced_provider"))
                    | ~Q(coalesced_author=OuterRef("coalesced_author"))
                    | ~Q(coalesced_aggregator=OuterRef("coalesced_aggregator"))
                    | ~Q(coalesced_license_id=OuterRef("coalesced_license_id"))
                )
            )
        ).filter(original_source_node_f_changed=True)
        final_nodes = diff_combined.values(
            "id",
            "channel_id",
            "original_channel_id",
            "original_source_node_id",
            "coalesced_provider",
            "coalesced_author",
            "coalesced_aggregator",
            "coalesced_license_id",
            "original_source_node_f_changed",
        ).order_by()

        for item in final_nodes:
            base_node = ContentNode.objects.get(pk=item["id"])
            original_source_channel_id = item["original_channel_id"]
            original_source_node_id = item["original_source_node_id"]
            tree_id = (
                Channel.objects.filter(pk=original_source_channel_id)
                .values_list("main_tree__tree_id", flat=True)
                .get()
            )
            original_source_node = ContentNode.objects.filter(
                tree_id=tree_id, node_id=original_source_node_id
            )

            base_channel = Channel.objects.get(pk=item['channel_id'])
            to_be_republished = not (base_channel.main_tree.get_family().filter(changed=True).exists())
            print("value of to be repblushied", to_be_republished)
            if original_source_channel_id is not None and original_source_node.exists():
                # original source node exists and its source fields dont match
                # update the base node
                if base_node.author != original_source_node[0].author:
                    base_node.author = original_source_node[0].author
                if base_node.provider != original_source_node[0].provider:
                    base_node.provider = original_source_node[0].provider
                if base_node.aggregator != original_source_node[0].aggregator:
                    base_node.aggregator = original_source_node[0].aggregator
                if base_node.license != original_source_node[0].license:
                    base_node.license = original_source_node[0].license

                base_node.save()
                if to_be_republished and base_channel.public:
                    # we would repbulish the channel
                    print("publishingg the channel!!")
                    publish_channel(self.user.id, base_channel.id)
            else:
                continue

    def test_two_node_case(self):
        base_channel = testdata.channel()
        base_channel.public = True
        base_channel.save()
        license_changed = License.objects.all()[1]
        base_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="base contentnode",
            parent=base_channel.main_tree,
            kind_id=content_kinds.VIDEO,
            license=license_changed,
            original_channel_id=self.original_channel.id,
            source_channel_id=self.original_channel.id,
            source_node_id=self.original_contentnode.node_id,
            original_source_node_id=self.original_contentnode.node_id,
            author="new herhe"
        )
        # publish_channel(self.user.id, Channel.objects.get(pk=base_channel.pk).id)
        for node in Channel.objects.get(pk=base_channel.pk).main_tree.get_family().filter(changed=True):
            node.changed = False
            node.save()

        ContentNode.objects.filter(pk=base_node.pk).update(
        modified=datetime.datetime(2023, 7, 5, tzinfo=timezone.utc)
        )

        # base_channel.refresh_from_db()
        # print(base_channel.main_tree.get_family().filter(changed=True))

        self.run_migrations()
        updated_base_node = ContentNode.objects.get(pk=base_node.pk)
        self.assertEqual(updated_base_node.license, self.original_contentnode.license)
        self.assertEqual(updated_base_node.author, self.original_contentnode.author)
        self.assertEqual(Channel.objects.get(pk=base_channel.id).main_tree.get_family().filter(changed=True).exists(), False)
        # assert(3==2)
