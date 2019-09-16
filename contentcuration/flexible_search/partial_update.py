# TODO:  the partial update code might go well with an abstracted
# version of the ContentNodeChannelInfo stuff.  They could form
# something like an "appendage" mixin mechanism, so that indexes could
# have partially updatable "appendages".  The mixin would handle all
# of the logic of preparing auxiliary data as well as the partial update
# itself.  They'd also provide a mechanism for executing the partial
# update.

from haystack.utils import get_identifier, get_model_ct
from haystack import indexes
from haystack_elasticsearch5 import Elasticsearch5SearchBackend as ElasticsearchSearchBackend
from haystack_elasticsearch5 import Elasticsearch5SearchEngine as ElasticsearchSearchEngine
from celery_haystack.handler import CeleryHaystackSignalHandler
from elasticsearch.helpers import bulk
from haystack.constants import ID
from celery_haystack import exceptions
import logging


logger = logging.getLogger(__name__)

def partial_data(identifier, **fields):
    data = {
        '_op_type': 'update',
        '_id': identifier,
    }
    data['doc'] = fields
    return data

class StudioElasticsearchBackend(ElasticsearchSearchBackend):

    def partial_update(self, data):
        print(data)
        bulk(self.conn, data, index=self.index_name, doc_type='modelresult')
        self.conn.indices.refresh(index=self.index_name)

class StudioElasticsearchEngine(ElasticsearchSearchEngine):
    backend = StudioElasticsearchBackend

class PartiallyUpdatableIndex(object):
    # Given a queryset, update one or more objects search index document without
    # touching the main DB.
    #
    # Note: index updates performed this way will be overwritten when haystack
    # reindexes their corresponding objects.
    def partial_update(self, queryset_or_obj, **fields):
        try:
            pks = queryset_or_obj.values_list('pk', flat=True)
        except AttributeError:
            pks = [queryset_or_obj.pk]
        identifiers = (
            "%s.%s" % (get_model_ct(self.get_model()), pk)
            for pk in pks
        )

        data = [partial_data(id, **fields) for id in identifiers]
        self.get_backend().partial_update(data)


class StudioCeleryHaystackSignalHandler(CeleryHaystackSignalHandler):

    def handle_update_channel_info(self, current_index, using, model_class):
        from contentcuration.models import Channel, ContentNode
        # and the instance of the model class with the pk
        partial_updates = []

        instance = self.get_instance(model_class, self.pk)
        if isinstance(instance, ContentNode):
            root = instance
            tree = root.get_descendants(include_self=True)
            updates = [(tree, current_index.prepare_channel_info(root))]

        # Call the appropriate handler of the current index and
        # handle exception if neccessary
        for subtree, channel_info in updates:
            try:
                current_index.partial_update(subtree, **channel_info)
            except Exception as exc:
                raise exceptions.IndexOperationException(index=current_index, reason=exc)
            else:
                msg = ("Partially updated '%s' (with %s)" %
                    (self.identifier, self.get_index_name(current_index)))
                logger.debug(msg)

    def handle(self, action):
        """
        Trigger the actual index handler depending on the
        given action ('update' or 'delete').
        """

        # Then get the model class for the object path
        model_class = self.get_model_class()

        for current_index, using in self.get_indexes(model_class):

            if action == 'delete':
                self.handle_delete(current_index, using, model_class)
            elif action == 'update':
                self.handle_update(current_index, using, model_class)
            elif action == 'update_channel_info':
                self.handle_update_channel_info(current_index, using, model_class)
            else:
                raise exceptions.UnrecognizedActionException(action)
