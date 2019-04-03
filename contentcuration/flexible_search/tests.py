from django.test import TestCase
from django.test import TransactionTestCase
from contentcuration.tests.testdata import topic
from .search_indexes import ContentNodeIndex
from haystack.query import SearchQuerySet
from random import choice
from string import ascii_letters
from contentcuration.models import ContentNode, ContentKind
from search_indexes import ContentNodeChannelInfo
from contentcuration.models import Channel, ContentNode
from django.core.management import call_command

class TestPartialUpdate(TransactionTestCase):
    def test_partial_update_contentnode(self):
        topic, _ = ContentKind.objects.get_or_create(kind="Topic")

        # original_title = ''.join(choice(ascii_letters) for l in range(20))
        node= ContentNode.objects.create(kind=topic)

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
            1
        )


class TestContentNodeChannelInfo(TransactionTestCase):

    def test_ensure_valid_fields(self):
        for field in ContentNodeChannelInfo.indexed_channel_fields():
            self.assert_(hasattr(Channel, field))

    def test_prepare_data(self):
        call_command('loadconstants')
        topic, _ = ContentKind.objects.get_or_create(kind="Topic")
        channel = Channel.objects.create()
        contentnode = ContentNode.objects.create(kind=topic)
        channel.main_tree = contentnode
        channel.save()



        # import ipdb; ipdb.set_trace()
