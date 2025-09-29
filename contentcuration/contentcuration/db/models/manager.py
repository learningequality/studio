import contextlib
import logging as logger
import time
import uuid

from django.db import transaction
from django.db.models import Manager
from django.db.models import Q
from django.db.utils import OperationalError
from django_cte import CTEQuerySet
from le_utils.constants import content_kinds
from mptt.managers import TreeManager
from mptt.signals import node_moved

from contentcuration.constants.locking import TREE_LOCK
from contentcuration.db.advisory_lock import advisory_lock
from contentcuration.db.models.query import CustomTreeQuerySet
from contentcuration.utils.cache import ResourceSizeCache


logging = logger.getLogger(__name__)

# A default batch size of lft/rght values to process
# at once for copy operations
# Local testing has so far indicated that a batch size of 100
# gives much better overall copy performance than smaller batch sizes
# but does not hold locks on the affected MPTT tree for too long (~0.03s)
# Larger batch sizes seem to give slightly better copy performance
# but at the cost of much longer tree locking times.
# See test_duplicate_nodes_benchmark
# in contentcuration/contentcuration/tests/test_contentnodes.py
# for more details.
# The exact optimum batch size is probably highly dependent on tree
# topology also, so these rudimentary tests are likely insufficient
BATCH_SIZE = 100


class CustomManager(Manager.from_queryset(CTEQuerySet)):
    """
    The CTEManager improperly overrides `get_queryset`
    """

    pass


def log_lock_time_spent(timespent):
    logging.debug("Spent {} seconds inside an mptt lock".format(timespent))


# Fields that are allowed to be overridden on copies coming from a source that the user
# does not have edit rights to.
ALLOWED_OVERRIDES = {
    "node_id",
    "title",
    "description",
    "aggregator",
    "provider",
    "language_id",
    "grade_levels",
    "resource_types",
    "learning_activities",
    "accessibility_labels",
    "categories",
    "learner_needs",
    "role",
    "extra_fields",
    "suggested_duration",
}

EDIT_ALLOWED_OVERRIDES = ALLOWED_OVERRIDES.union(
    {
        "license_id",
        "license_description",
        "extra_fields",
        "copyright_holder",
        "author",
    }
)


class CustomContentNodeTreeManager(TreeManager.from_queryset(CustomTreeQuerySet)):
    # Added 7-31-2018. We can remove this once we are certain we have eliminated all cases
    # where root nodes are getting prepended rather than appended to the tree list.
    def _create_tree_space(self, target_tree_id, num_trees=1):
        """
        Creates space for a new tree by incrementing all tree ids
        greater than ``target_tree_id``.
        """

        if target_tree_id == -1:
            raise Exception(
                "ERROR: Calling _create_tree_space with -1! Something is attempting to sort all MPTT trees root nodes!"
            )

        return super(CustomContentNodeTreeManager, self)._create_tree_space(
            target_tree_id, num_trees
        )

    def _get_next_tree_id(self, *args, **kwargs):
        from contentcuration.models import MPTTTreeIDManager

        new_id = MPTTTreeIDManager.objects.create().id
        return new_id

    @contextlib.contextmanager
    def _attempt_lock(self, tree_ids, shared_tree_ids=None):
        """
        Internal method to allow the lock_mptt method to do retries in case of deadlocks
        """
        shared_tree_ids = shared_tree_ids or []

        start = time.time()
        with transaction.atomic():
            # Issue a separate lock on each tree_id
            # in a predictable order.
            # This will mean that every process acquires locks in the same order
            # and should help to minimize deadlocks
            for tree_id in tree_ids:
                advisory_lock(
                    TREE_LOCK, key2=tree_id, shared=tree_id in shared_tree_ids
                )
            yield
            log_lock_time_spent(time.time() - start)

    @contextlib.contextmanager
    def lock_mptt(self, *tree_ids, **kwargs):
        tree_ids = sorted((t for t in set(tree_ids) if t is not None))
        shared_tree_ids = kwargs.pop("shared_tree_ids", [])
        # If this is not inside the context of a delay context manager
        # or updates are not disabled set a lock on the tree_ids.
        if (
            not self.model._mptt_is_tracking
            and self.model._mptt_updates_enabled
            and tree_ids
        ):
            try:
                with self._attempt_lock(tree_ids, shared_tree_ids=shared_tree_ids):
                    yield
            except OperationalError as e:
                if "deadlock detected" in e.args[0]:
                    logging.error(
                        "Deadlock detected while trying to lock ContentNode trees for mptt operations, retrying"
                    )
                    with self._attempt_lock(tree_ids, shared_tree_ids=shared_tree_ids):
                        yield
                else:
                    raise
        else:
            # Otherwise just let it carry on!
            yield

    def partial_rebuild(self, tree_id):
        with self.lock_mptt(tree_id):
            return super(CustomContentNodeTreeManager, self).partial_rebuild(tree_id)

    def _move_child_to_new_tree(self, node, target, position):
        from contentcuration.models import PrerequisiteContentRelationship

        super(CustomContentNodeTreeManager, self)._move_child_to_new_tree(
            node, target, position
        )
        PrerequisiteContentRelationship.objects.filter(
            Q(prerequisite_id=node.id) | Q(target_node_id=node.id)
        ).delete()

    def _mptt_refresh(self, *nodes):
        """
        This is based off the MPTT model method mptt_refresh
        except that handles an arbitrary list of nodes to get
        the updated values in a single DB query.
        """
        ids = [node.id for node in nodes if node.id]
        # Don't bother doing a query if no nodes
        # were passed in
        if not ids:
            return
        opts = self.model._mptt_meta
        # Look up all the mptt field values
        # and the id so we can marry them up to the
        # passed in nodes.
        values_lookup = {
            # Create a lookup dict to cross reference
            # with the passed in nodes.
            c["id"]: c
            for c in self.filter(id__in=ids).values(
                "id",
                opts.left_attr,
                opts.right_attr,
                opts.level_attr,
                opts.tree_id_attr,
            )
        }
        for node in nodes:
            # Set the values on each of the nodes
            if node.id and node.id in values_lookup:
                values = values_lookup[node.id]
                for k, v in values.items():
                    setattr(node, k, v)

    def move_node(self, node, target, position="last-child"):
        """
        Vendored from mptt - by default mptt moves then saves
        This is updated to call the save with the skip_lock kwarg
        to prevent a second atomic transaction and tree locking context
        being opened.

        Moves ``node`` relative to a given ``target`` node as specified
        by ``position`` (when appropriate), by examining both nodes and
        calling the appropriate method to perform the move.
        A ``target`` of ``None`` indicates that ``node`` should be
        turned into a root node.
        Valid values for ``position`` are ``'first-child'``,
        ``'last-child'``, ``'left'`` or ``'right'``.
        ``node`` will be modified to reflect its new tree state in the
        database.
        This method explicitly checks for ``node`` being made a sibling
        of a root node, as this is a special case due to our use of tree
        ids to order root nodes.
        NOTE: This is a low-level method; it does NOT respect
        ``MPTTMeta.order_insertion_by``.  In most cases you should just
        move the node yourself by setting node.parent.
        """
        old_parent = node.parent
        with self.lock_mptt(node.tree_id, target.tree_id):
            # Call _mptt_refresh to ensure that the mptt fields on
            # these nodes are up to date once we have acquired a lock
            # on the associated trees. This means that the mptt data
            # will remain fresh until the lock is released at the end
            # of the context manager.
            self._mptt_refresh(node, target)
            # N.B. this only calls save if we are running inside a
            # delay MPTT updates context
            self._move_node(node, target, position=position)
            node.save(skip_lock=True)
        node_moved.send(
            sender=node.__class__,
            instance=node,
            target=target,
            position=position,
        )
        # when moving to a new tree, like trash, we'll blanket reset the modified for the
        # new root and the old root nodes
        if old_parent.tree_id != target.tree_id:
            for size_cache in [
                ResourceSizeCache(target.get_root()),
                ResourceSizeCache(old_parent.get_root()),
            ]:
                size_cache.reset_modified(None)

    def get_source_attributes(self, source):
        """
        These attributes will be copied when the node is copied
        and also when a copy is synced with its source
        """
        return {
            "content_id": source.content_id,
            "kind_id": source.kind_id,
            "title": source.title,
            "description": source.description,
            "language_id": source.language_id,
            "license_id": source.license_id,
            "license_description": source.license_description,
            "thumbnail_encoding": source.thumbnail_encoding,
            "extra_fields": source.extra_fields,
            "copyright_holder": source.copyright_holder,
            "author": source.author,
            "provider": source.provider,
            "role_visibility": source.role_visibility,
            "grade_levels": source.grade_levels,
            "resource_types": source.resource_types,
            "learning_activities": source.learning_activities,
            "accessibility_labels": source.accessibility_labels,
            "categories": source.categories,
            "learner_needs": source.learner_needs,
            "suggested_duration": source.suggested_duration,
        }

    def _clone_node(
        self, source, parent_id, source_channel_id, can_edit_source_channel, pk, mods
    ):
        copy = {
            "id": pk or uuid.uuid4().hex,
            "node_id": uuid.uuid4().hex,
            "aggregator": source.aggregator,
            "cloned_source": source,
            "source_channel_id": source_channel_id,
            "source_node_id": source.node_id,
            "original_channel_id": source.original_channel_id,
            "original_source_node_id": source.original_source_node_id,
            "freeze_authoring_data": not can_edit_source_channel
            or source.freeze_authoring_data,
            "changed": True,
            "published": False,
            "parent_id": parent_id,
            "complete": source.complete,
        }

        copy.update(self.get_source_attributes(source))

        if isinstance(mods, dict):
            allowed_keys = (
                EDIT_ALLOWED_OVERRIDES if can_edit_source_channel else ALLOWED_OVERRIDES
            )
            for key, value in mods.items():
                if key in copy and key in allowed_keys:
                    copy[key] = value

        # There might be some legacy nodes that don't have these, so ensure they are added
        if (
            copy["original_channel_id"] is None
            or copy["original_source_node_id"] is None
        ):
            original_node = source.get_original_node()
            if copy["original_channel_id"] is None:
                original_channel = original_node.get_channel()
                copy["original_channel_id"] = (
                    original_channel.id if original_channel else None
                )
            if copy["original_source_node_id"] is None:
                copy["original_source_node_id"] = original_node.node_id

        return copy

    def _recurse_to_create_tree(
        self,
        source,
        parent_id,
        source_channel_id,
        nodes_by_parent,
        source_copy_id_map,
        can_edit_source_channel,
        pk,
        mods,
    ):
        copy = self._clone_node(
            source,
            parent_id,
            source_channel_id,
            can_edit_source_channel,
            pk,
            mods,
        )

        if source.kind_id == content_kinds.TOPIC and source.id in nodes_by_parent:
            children = sorted(nodes_by_parent[source.id], key=lambda x: x.lft)
            copy["children"] = list(
                map(
                    lambda x: self._recurse_to_create_tree(
                        x,
                        copy["id"],
                        source_channel_id,
                        nodes_by_parent,
                        source_copy_id_map,
                        can_edit_source_channel,
                        None,
                        None,
                    ),
                    children,
                )
            )
        source_copy_id_map[source.id] = copy["id"]
        return copy

    def _all_nodes_to_copy(self, node, excluded_descendants):
        nodes_to_copy = node.get_descendants(include_self=True)

        if excluded_descendants:
            excluded_descendants = self.filter(
                node_id__in=excluded_descendants.keys()
            ).get_descendants(include_self=True)
            nodes_to_copy = nodes_to_copy.difference(excluded_descendants)
        return nodes_to_copy

    def copy_node(
        self,
        node,
        target=None,
        position="last-child",
        pk=None,
        mods=None,
        excluded_descendants=None,
        can_edit_source_channel=None,
        batch_size=None,
        progress_tracker=None,
    ):
        """
        :type progress_tracker: contentcuration.utils.celery.ProgressTracker|None
        """
        if batch_size is None:
            batch_size = BATCH_SIZE
        source_channel_id = node.get_channel_id()

        total_nodes = self._all_nodes_to_copy(node, excluded_descendants).count()
        if progress_tracker:
            progress_tracker.set_total(total_nodes)

        return self._copy(
            node,
            target,
            position,
            source_channel_id,
            pk,
            mods,
            excluded_descendants,
            can_edit_source_channel,
            batch_size,
            progress_tracker=progress_tracker,
        )

    def _copy(
        self,
        node,
        target,
        position,
        source_channel_id,
        pk,
        mods,
        excluded_descendants,
        can_edit_source_channel,
        batch_size,
        progress_tracker=None,
    ):
        """
        :type progress_tracker: contentcuration.utils.celery.ProgressTracker|None
        """
        if node.rght - node.lft < batch_size:
            copied_nodes = self._deep_copy(
                node,
                target,
                position,
                source_channel_id,
                pk,
                mods,
                excluded_descendants,
                can_edit_source_channel,
            )
            if progress_tracker:
                progress_tracker.increment(len(copied_nodes))
            return copied_nodes
        node_copy = self._shallow_copy(
            node,
            target,
            position,
            source_channel_id,
            pk,
            mods,
            can_edit_source_channel,
        )
        if progress_tracker:
            progress_tracker.increment()
        children = node.get_children().order_by("lft")
        if excluded_descendants:
            children = children.exclude(node_id__in=excluded_descendants.keys())
        for child in children:
            self._copy(
                child,
                node_copy,
                "last-child",
                source_channel_id,
                None,
                None,
                excluded_descendants,
                can_edit_source_channel,
                batch_size,
                progress_tracker=progress_tracker,
            )
        return [node_copy]

    def _copy_tags(self, source_copy_id_map):
        from contentcuration.models import ContentTag

        node_tags_mappings = list(
            self.model.tags.through.objects.filter(
                contentnode_id__in=source_copy_id_map.keys()
            )
        )

        tags_to_copy = ContentTag.objects.filter(
            tagged_content__in=source_copy_id_map.keys(), channel__isnull=False
        )

        # Get a lookup of all existing null channel tags so we don't duplicate
        existing_tags_lookup = {
            t["tag_name"]: t["id"]
            for t in ContentTag.objects.filter(
                tag_name__in=tags_to_copy.values_list("tag_name", flat=True),
                channel__isnull=True,
            ).values("tag_name", "id")
        }
        tags_to_copy = list(tags_to_copy)

        tags_to_create = []

        tag_id_map = {}

        for tag in tags_to_copy:
            if tag.tag_name in existing_tags_lookup:
                tag_id_map[tag.id] = existing_tags_lookup.get(tag.tag_name)
            else:
                new_tag = ContentTag(tag_name=tag.tag_name)
                tag_id_map[tag.id] = new_tag.id
                tags_to_create.append(new_tag)

        # TODO: Can cleanup the above and change the below to use ignore_conflicts=True
        ContentTag.objects.bulk_create(tags_to_create)

        mappings_to_create = [
            self.model.tags.through(
                contenttag_id=tag_id_map.get(
                    mapping.contenttag_id, mapping.contenttag_id
                ),
                contentnode_id=source_copy_id_map.get(mapping.contentnode_id),
            )
            for mapping in node_tags_mappings
        ]

        # In the case that we are copying a node that is in the weird state of having a tag
        # that is duplicated (with a channel tag and a null channel tag) this can cause an error
        # so we ignore conflicts here to ignore the duplicate tags.
        self.model.tags.through.objects.bulk_create(
            mappings_to_create, ignore_conflicts=True
        )

    def _copy_assessment_items(self, source_copy_id_map):
        from contentcuration.models import File
        from contentcuration.models import AssessmentItem

        node_assessmentitems = list(
            AssessmentItem.objects.filter(contentnode_id__in=source_copy_id_map.keys())
        )
        node_assessmentitem_files = list(
            File.objects.filter(assessment_item__in=node_assessmentitems)
        )

        assessmentitem_old_id_lookup = {}

        for assessmentitem in node_assessmentitems:
            old_id = assessmentitem.id
            assessmentitem.id = None
            assessmentitem.contentnode_id = source_copy_id_map[
                assessmentitem.contentnode_id
            ]
            assessmentitem_old_id_lookup[
                assessmentitem.contentnode_id + ":" + assessmentitem.assessment_id
            ] = old_id

        node_assessmentitems = AssessmentItem.objects.bulk_create(node_assessmentitems)

        assessmentitem_new_id_lookup = {}

        for assessmentitem in node_assessmentitems:
            old_id = assessmentitem_old_id_lookup[
                assessmentitem.contentnode_id + ":" + assessmentitem.assessment_id
            ]
            assessmentitem_new_id_lookup[old_id] = assessmentitem.id

        for file in node_assessmentitem_files:
            file.id = None
            file.assessment_item_id = assessmentitem_new_id_lookup[
                file.assessment_item_id
            ]

        File.objects.bulk_create(node_assessmentitem_files)

    def _copy_files(self, source_copy_id_map):
        from contentcuration.models import File

        node_files = list(
            File.objects.filter(contentnode_id__in=source_copy_id_map.keys())
        )

        for file in node_files:
            file.id = None
            file.contentnode_id = source_copy_id_map[file.contentnode_id]

        File.objects.bulk_create(node_files)

    def _copy_associated_objects(self, source_copy_id_map):
        self._copy_files(source_copy_id_map)

        self._copy_assessment_items(source_copy_id_map)

        self._copy_tags(source_copy_id_map)

    def _shallow_copy(
        self,
        node,
        target,
        position,
        source_channel_id,
        pk,
        mods,
        can_edit_source_channel,
    ):
        data = self._clone_node(
            node,
            None,
            source_channel_id,
            can_edit_source_channel,
            pk,
            mods,
        )
        with self.lock_mptt(target.tree_id if target else None):
            node_copy = self.model(**data)
            if target:
                self._mptt_refresh(target)
            self.insert_node(node_copy, target, position=position, save=False)
            node_copy.save(force_insert=True)

        self._copy_associated_objects({node.id: node_copy.id})
        return node_copy

    def _deep_copy(
        self,
        node,
        target,
        position,
        source_channel_id,
        pk,
        mods,
        excluded_descendants,
        can_edit_source_channel,
    ):
        # lock mptt source tree with shared advisory lock
        with self.lock_mptt(node.tree_id, shared_tree_ids=[node.tree_id]):
            nodes_to_copy = list(self._all_nodes_to_copy(node, excluded_descendants))

        nodes_by_parent = {}
        for copy_node in nodes_to_copy:
            if copy_node.parent_id not in nodes_by_parent:
                nodes_by_parent[copy_node.parent_id] = []
            nodes_by_parent[copy_node.parent_id].append(copy_node)

        source_copy_id_map = {}

        parent_id = None
        # If the position is *-child then parent is target
        # but if it is not - then our parent is the same as the target's parent
        if target:
            if position in ["last-child", "first-child"]:
                parent_id = target.id
            else:
                parent_id = target.parent_id

        data = self._recurse_to_create_tree(
            node,
            parent_id,
            source_channel_id,
            nodes_by_parent,
            source_copy_id_map,
            can_edit_source_channel,
            pk,
            mods,
        )

        with self.lock_mptt(target.tree_id if target else None):
            if target:
                self._mptt_refresh(target)
            nodes_to_create = self.build_tree_nodes(
                data, target=target, position=position
            )
            new_nodes = self.bulk_create(nodes_to_create)
        if target:
            self.filter(pk=target.pk).update(changed=True)

        self._copy_associated_objects(source_copy_id_map)

        return new_nodes
