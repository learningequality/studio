import uuid

from automation.models import RecommendationsCache
from django.db import IntegrityError
from kolibri_public.models import ContentNode

from contentcuration.models import Channel
from contentcuration.tests.base import StudioTestCase


class TestRecommendationsCache(StudioTestCase):

    def setUp(self):
        self.topic_id = uuid.uuid4()
        self.content_node = ContentNode.objects.create(
            id=uuid.uuid4(),
            title='Test Content Node',
            content_id=uuid.uuid4(),
            channel_id=uuid.uuid4(),
        )
        self.channel = Channel.objects.create(
            id=uuid.uuid4(),
            name='Test Channel',
            actor_id=1,
        )
        self.cache = RecommendationsCache.objects.create(
            request_hash='test_hash',
            topic_id=self.topic_id,
            contentnode=self.content_node,
            channel=self.channel,
            rank=1,
            override_threshold=False
        )

    def test_cache_creation(self):
        self.assertIsInstance(self.cache, RecommendationsCache)
        self.assertEqual(self.cache.request_hash, 'test_hash')
        self.assertEqual(self.cache.topic_id, self.topic_id)
        self.assertEqual(self.cache.contentnode, self.content_node)
        self.assertEqual(self.cache.channel, self.channel)
        self.assertEqual(self.cache.rank, 1)
        self.assertFalse(self.cache.override_threshold)

    def test_cache_retrieval(self):
        retrieved_cache = RecommendationsCache.objects.get(request_hash='test_hash')
        self.assertEqual(retrieved_cache, self.cache)

    def test_cache_uniqueness(self):
        with self.assertRaises(IntegrityError):
            RecommendationsCache.objects.create(
                request_hash='test_hash',
                topic_id=self.topic_id,
                contentnode=self.content_node,
                channel=self.channel,
                rank=2,
                override_threshold=True
            )

    def test_bulk_create_ignore_conflicts_true(self):
        initial_count = RecommendationsCache.objects.count()
        try:
            RecommendationsCache.objects.bulk_create(
                [self.cache, self.cache],
                ignore_conflicts=True
            )
        except IntegrityError:
            self.fail("bulk_create raised IntegrityError unexpectedly!")

        final_count = RecommendationsCache.objects.count()
        self.assertEqual(initial_count, final_count)

    def test_bulk_create_ignore_conflicts_false(self):
        with self.assertRaises(IntegrityError):
            RecommendationsCache.objects.bulk_create(
                [self.cache, self.cache],
                ignore_conflicts=False
            )
