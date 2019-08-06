from django.core.urlresolvers import reverse_lazy

from ..base import BaseAPITestCase
from contentcuration.models import ContentNode


class BaseGetNodesByIdSerializerTestCaseMixin:
    """
    We have several content node serializer endpoints, which differ primarily only
    in the fields they return. This class contains some basic tests that can be
    run on all the serializers just by setting the class endpoint and serializer_fields
    properties. (See below classes for example.)
    """
    def test_get_nodes_by_ids_no_ids(self):
        """
        Ensure that get_nodes_by_ids succeeds but does not return any data
        when called without any ID arguments.
        """
        response = self.get('/api/{}/'.format(self.endpoint))
        self.assertEqual(response.status_code, 404)

    def test_get_nodes_by_ids_get_only(self):
        """
        Ensures that attempting to POST or PUT data on these endpoints returns
        a 405 (method not allowed) error.
        """
        response = self.post('/api/{}/'.format(self.endpoint), {})
        self.assertEqual(response.status_code, 405)

        response = self.put('/api/{}/'.format(self.endpoint), {})
        self.assertEqual(response.status_code, 405)

    def test_get_nodes_by_ids_empty(self):
        """
        Ensure that calling get_nodes_by_ids with an empty ids value succeeds
        but does not return any data.
        """
        response = self.get(reverse_lazy(self.endpoint, kwargs={"ids": ''}))
        self.assertEqual(response.status_code, 404)

    def test_get_nodes_by_ids_with_invalid_id(self):
        """
        Ensure that calling get_nodes_by_ids with an invalid id succeeds but
        does not return node data.
        """
        response = self.get(reverse_lazy(self.endpoint, kwargs={"ids": '1234'}))
        self.assertEqual(response.status_code, 404)

    def test_get_nodes_by_ids_single(self):
        """
        Ensure that calling get_nodes_by_ids with a single ID succeeds and returns
        information about the requested node and contains all the expected fields.
        """
        node = ContentNode.objects.get(node_id='00000000000000000000000000000001')
        response = self.get(reverse_lazy(self.endpoint, kwargs={"ids": node.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], node.pk)
        for field in self.serializer_fields:
            assert field in response.data[0]

    def test_get_nodes_by_ids_multiple(self):
        """
        Ensure that calling get_nodes_by_ids with a list of IDs succeeds and returns
        information about all the requested nodes.
        """
        node_ids = ContentNode.objects.all().values_list('pk', flat=True)
        response = self.get(reverse_lazy(self.endpoint, kwargs={"ids": ','.join(node_ids)}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(node_ids))
        for node in response.data:
            assert node['id'] in node_ids


class SimplfiedContentNodeSerializerTestCase(BaseGetNodesByIdSerializerTestCaseMixin, BaseAPITestCase):
    endpoint = "get_nodes_by_ids_simplified"
    serializer_fields = (
        'title', 'id', 'sort_order', 'kind', 'children', 'parent', 'metadata', 'content_id', 'prerequisite',
        'is_prerequisite_of', 'ancestors', 'tree_id', 'language', 'role_visibility'
    )


class ContentNodeSerializerTestCase(BaseGetNodesByIdSerializerTestCaseMixin, BaseAPITestCase):
    endpoint = "get_nodes_by_ids"
    serializer_fields = (
        'title', 'changed', 'id', 'description', 'sort_order', 'author', 'copyright_holder',
        'license', 'language', 'license_description', 'assessment_items', 'slideshow_slides',
        'files', 'ancestors', 'modified', 'original_channel', 'kind', 'parent',
        'children', 'published', 'associated_presets', 'valid', 'metadata', 'original_source_node_id',
        'tags', 'extra_fields', 'prerequisite', 'is_prerequisite_of', 'node_id', 'tree_id',
        'publishing', 'freeze_authoring_data', 'role_visibility', 'provider', 'aggregator',
        'thumbnail_src'
    )


class CompleteContentNodeSerializerTestCase(BaseGetNodesByIdSerializerTestCaseMixin, BaseAPITestCase):
    endpoint = "get_nodes_by_ids_complete"
    serializer_fields = (
        'title', 'changed', 'id', 'description', 'sort_order', 'author', 'copyright_holder',
        'license', 'language', 'node_id', 'license_description', 'assessment_items',
        'slideshow_slides', 'files', 'content_id', 'modified', 'kind', 'parent',
        'children', 'published', 'associated_presets', 'valid', 'metadata', 'ancestors', 'tree_id',
        'tags', 'extra_fields', 'original_channel', 'prerequisite', 'is_prerequisite_of',
        'thumbnail_encoding', 'thumbnail_src', 'freeze_authoring_data', 'publishing',
        'original_source_node_id', 'role_visibility', 'provider', 'aggregator'
    )
