from django.db import transaction
from django.db.models.functions import Length
from kolibri_content import models as kolibri_content_models
from kolibri_content.base_models import MAX_TAG_LENGTH
from kolibri_public import models as kolibri_public_models
from kolibri_public.search import annotate_label_bitmasks
from kolibri_public.utils.annotation import set_channel_metadata_fields
from le_utils.constants import content_kinds


BATCH_SIZE = 1000


class ChannelMapper(object):
    """
    This object handles mapping from models defined in the kolibri_content app
    and maps them to models in the kolibri_public app.
    Uses the ChannelMetadata as the starting point as all other information is
    Foreign Keyed from the root ContentNode.
    """

    def __init__(
        self,
        channel,
        channel_version=None,
        public=True,
        categories=None,
        countries=None,
    ):
        self.channel = channel
        self.channel_version = channel_version
        self.public = public
        self.categories = categories
        self.countries = countries

    @property
    def overrides(self):
        return {
            kolibri_public_models.ContentNode: {
                "available": True,
                "tree_id": self.tree_id,
            },
            kolibri_public_models.LocalFile: {
                "available": True,
            },
        }

    def _handle_old_tree_if_exists(self):
        try:
            old_channel = kolibri_public_models.ChannelMetadata.objects.get(
                id=self.channel.id
            )
            self.tree_id = old_channel.root.tree_id
            old_channel.root.get_descendants(include_self=True).delete()
        except kolibri_public_models.ChannelMetadata.DoesNotExist:
            self.tree_id = kolibri_public_models.MPTTTreeIDManager.objects.create().id

    def run(self):
        with transaction.atomic():
            self._handle_old_tree_if_exists()
            self.mapped_root = self.map_root(self.channel.root)
            self.mapped_channel = self._map_model(
                self.channel, kolibri_public_models.ChannelMetadata
            )
            self.mapped_channel.public = self.public
            self.mapped_channel.save_base(raw=True)
            annotate_label_bitmasks(self.mapped_root.get_descendants(include_self=True))
            # Rather than set the ancestors fields after mapping, like it is done in Kolibri
            # here we set it during mapping as we are already recursing through the tree.

            set_channel_metadata_fields(
                self.mapped_channel.id,
                channel_version=self.channel_version,
                public=self.public,
                categories=self.categories,
                countries=self.countries,
            )

            # Refreshing this is needed, because otherwise the fields set in the
            # set_channel_metadata_fields function will not be reflected in the
            # self.mapped_channel object.
            self.mapped_channel.refresh_from_db()

    def _map_model(self, source, Model):
        properties = {}
        for field in Model._meta.fields:
            column = field.column
            if hasattr(source, column):
                properties[column] = getattr(source, column)
            if Model in self.overrides and column in self.overrides[Model]:
                properties[column] = self.overrides[Model][column]

        return Model(**properties)

    def _map_and_bulk_create_model(self, sources, Model):
        cloned_sources = [self._map_model(source, Model) for source in sources]

        Model.objects.bulk_create(cloned_sources, ignore_conflicts=True)

    def _map_node(self, source, ancestors):
        node = self._map_model(source, kolibri_public_models.ContentNode)
        node.ancestors = ancestors
        return node

    def _extend_ancestors(self, ancestors, new_ancestor):
        return ancestors + [
            {"id": new_ancestor.id, "title": new_ancestor.title.replace('"', '\\"')}
        ]

    def _recurse_to_create_tree(
        self,
        source,
        nodes_by_parent,
        ancestors,
    ):
        nodes_to_create = [self._map_node(source, ancestors)]

        if source.kind == content_kinds.TOPIC and source.id in nodes_by_parent:
            children = sorted(nodes_by_parent[source.id], key=lambda x: x.lft)
            ancestors = self._extend_ancestors(ancestors, source)
            for child in children:
                nodes_to_create.extend(
                    self._recurse_to_create_tree(
                        child,
                        nodes_by_parent,
                        ancestors,
                    )
                )
        return nodes_to_create

    def map_root(self, root, batch_size=None, progress_tracker=None):
        """
        :type progress_tracker: contentcuration.utils.celery.ProgressTracker|None
        """
        if batch_size is None:
            batch_size = BATCH_SIZE

        return self._map(
            root,
            batch_size,
            progress_tracker=progress_tracker,
        )[0]

    def _map(
        self,
        node,
        batch_size,
        ancestors=[],
        progress_tracker=None,
    ):
        """
        :type progress_tracker: contentcuration.utils.celery.ProgressTracker|None
        """
        if node.rght - node.lft < batch_size:
            copied_nodes = self._deep_map(
                node,
                ancestors,
            )
            if progress_tracker:
                progress_tracker.increment(len(copied_nodes))
            return copied_nodes
        node_copy = self._shallow_map(
            node,
            ancestors,
        )
        ancestors = self._extend_ancestors(ancestors, node)
        if progress_tracker:
            progress_tracker.increment()
        children = node.get_children().order_by("lft")
        for child in children:
            self._map(
                child,
                batch_size,
                ancestors=ancestors,
                progress_tracker=progress_tracker,
            )
        return [node_copy]

    def _copy_tags(self, node_ids):
        initial_source_tag_mappings = (
            kolibri_content_models.ContentNode.tags.through.objects.filter(
                contentnode_id__in=node_ids
            )
        )

        source_tags = kolibri_content_models.ContentTag.objects.annotate(
            tag_name_len=Length("tag_name"),
        ).filter(
            id__in=initial_source_tag_mappings.values_list("contenttag_id", flat=True),
            tag_name_len__lte=MAX_TAG_LENGTH,
        )

        source_tag_mappings = initial_source_tag_mappings.filter(
            contenttag_id__in=source_tags.values_list("id", flat=True),
        )

        self._map_and_bulk_create_model(source_tags, kolibri_public_models.ContentTag)

        self._map_and_bulk_create_model(
            source_tag_mappings, kolibri_public_models.ContentNode.tags.through
        )

    def _copy_assessment_metadata(self, node_ids):
        node_assessmentmetadata = (
            kolibri_content_models.AssessmentMetaData.objects.filter(
                contentnode_id__in=node_ids
            )
        )

        self._map_and_bulk_create_model(
            node_assessmentmetadata, kolibri_public_models.AssessmentMetaData
        )

    def _copy_files(self, node_ids):
        node_files = kolibri_content_models.File.objects.filter(
            contentnode_id__in=node_ids
        )

        local_files = kolibri_content_models.LocalFile.objects.filter(
            id__in=node_files.values_list("local_file_id", flat=True)
        )

        self._map_and_bulk_create_model(local_files, kolibri_public_models.LocalFile)

        self._map_and_bulk_create_model(node_files, kolibri_public_models.File)

    def _copy_associated_objects(self, nodes):
        node_ids = [node.id for node in nodes]

        self._copy_files(node_ids)

        self._copy_assessment_metadata(node_ids)

        self._copy_tags(node_ids)

    def _shallow_map(
        self,
        node,
        ancestors,
    ):
        mapped_node = self._map_node(node, ancestors)

        mapped_node.save_base(raw=True)

        self._copy_associated_objects([node])
        return mapped_node

    def _deep_map(
        self,
        node,
        ancestors,
    ):
        source_nodes = node.get_descendants(include_self=True)

        nodes_by_parent = {}
        for source_node in source_nodes:
            if source_node.parent_id not in nodes_by_parent:
                nodes_by_parent[source_node.parent_id] = []
            nodes_by_parent[source_node.parent_id].append(source_node)

        nodes_to_create = self._recurse_to_create_tree(
            node,
            nodes_by_parent,
            ancestors,
        )

        mapped_nodes = kolibri_public_models.ContentNode.objects.bulk_create(
            nodes_to_create
        )

        # filter to only the nodes that were created, since some source nodes could have
        # been problematic
        self._copy_associated_objects(
            source_nodes.filter(
                id__in=[mapped_node.id for mapped_node in mapped_nodes],
            )
        )

        return mapped_nodes
