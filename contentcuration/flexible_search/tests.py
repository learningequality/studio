from django.test import TestCase
from django.test import TransactionTestCase
from contentcuration.tests.testdata import topic, channel
from .search_indexes import ContentNodeIndex
from haystack.query import SearchQuerySet
from random import choice
from string import ascii_letters
from search_indexes import ContentNodeChannelInfo
from contentcuration.models import ContentNode, ContentKind
from contentcuration.models import Channel, ContentNode
from django.core.management import call_command

class TestPartialUpdate(TransactionTestCase):
    def test_partial_update_contentnode(self):
        topic, _ = ContentKind.objects.get_or_create(kind="Topic")

        node= ContentNode.objects.create(kind=topic)
        node.save()

        random_text = 'abc'
        self.assertEqual(
            len(SearchQuerySet().filter(some_field=random_text)),
            0
        )

        ContentNodeIndex().partial_update(node, some_field=random_text)

        self.assertEqual(
            len(SearchQuerySet().filter(some_field=random_text)),
            1
        )

        ContentNodeIndex().update_object(node)

        self.assertEqual(
            len(SearchQuerySet().filter(some_field=random_text)),
            0
        )


class TestContentNodeChannelInfo(TransactionTestCase):

    def test_sanity(self):
        call_command('loadconstants')
        topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        some_channel = channel()
        some_node = ContentNode.objects.create(kind=topic)
        some_node.parent = some_channel.main_tree
        some_node.save()

        assert some_node.get_channel().pk == some_channel.pk


    def test_ensure_valid_fields(self):
        for field in ContentNodeChannelInfo.indexed_channel_fields():
            self.assert_(hasattr(Channel, field))

    def test_prepare_data(self):
        call_command('loadconstants')
        some_channel = channel()
        topic, _ = ContentKind.objects.get_or_create(kind="Topic")
        some_contentnode = ContentNode.objects.create(kind=topic)
        some_contentnode.parent = some_channel.main_tree
        some_contentnode.save()

        self.assertEqual(
            len(SearchQuerySet().filter(channel_pk=some_channel.pk)),
            1
        )
