import uuid

from automation.models import RecommendationsCache
from django.db import IntegrityError
from kolibri_public.models import ContentNode

from contentcuration.tests.base import StudioTestCase


class TestRecommendationsCache(StudioTestCase):

    def setUp(self):
        self.content_node = ContentNode.objects.create(
            id=uuid.uuid4(),
            title='Test Content Node',
            content_id=uuid.uuid4(),
            channel_id=uuid.uuid4(),
        )
        self.cache = RecommendationsCache.objects.create(
            request_hash='test_hash',
            contentnode_id=self.content_node,
            rank=1.0,
            override_threshold=False
        )

    def test_cache_creation(self):
        self.assertIsInstance(self.cache, RecommendationsCache)
        self.assertEqual(self.cache.request_hash, 'test_hash')
        self.assertEqual(self.cache.contentnode_id, self.content_node)
        self.assertEqual(self.cache.rank, 1.0)
        self.assertFalse(self.cache.override_threshold)

    def test_cache_retrieval(self):
        retrieved_cache = RecommendationsCache.objects.get(request_hash='test_hash')
        self.assertEqual(retrieved_cache, self.cache)

    def test_cache_uniqueness(self):
        with self.assertRaises(IntegrityError):
            RecommendationsCache.objects.create(
                request_hash='test_hash',
                contentnode_id=self.content_node,
                rank=2.0,
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
