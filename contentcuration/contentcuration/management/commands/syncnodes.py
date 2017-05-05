import copy
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from contentcuration.models import Channel, ContentNode, AssessmentItem, File, ContentTag
from le_utils.constants import content_kinds

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)
        parser.add_argument('--attributes', action='store_true', dest='attributes', default=False)
        parser.add_argument('--sort', action='store_true', dest='sort', default=False)
        parser.add_argument('--tags', action='store_true', dest='tags', default=False)
        parser.add_argument('--files', action='store_true', dest='files', default=False)
        parser.add_argument('--assessment-items', action='store_true', dest='assessment_items', default=False)

    def handle(self, *args, **options):
        channel = Channel.objects.get(pk=options['channel_id'])
        sync_attributes = options['attributes']
        sync_sort_order = options['sort']
        sync_tags = options['tags']
        sync_files = options['files']
        sync_assessment_items = options['assessment_items']
        parents_to_check = [] # Keep track of parents to make resorting easier

        with transaction.atomic():
            with ContentNode.objects.delay_mptt_updates():
                logging.info("Syncing nodes for channel {} (id:{})".format(channel.name, channel.pk))
                for node in channel.main_tree.get_descendants():
                    original_node = node.get_original_node()
                    if original_node.node_id != node.node_id: # Only update if node is not original
                        logging.info("----- Syncing: {} from {}".format(node.title.encode('utf-8'), original_node.get_channel().name.encode('utf-8')))
                        if sync_attributes:
                            sync_node(node, original_node)
                        if sync_sort_order:
                            node.sort_order = original_node.sort_order
                            if node.parent not in parents_to_check:
                                parents_to_check.append(node.parent)
                        if sync_tags:
                            sync_node_tags(node, original_node, options['channel_id'])
                        if sync_files:
                            sync_node_files(node, original_node)
                        if sync_assessment_items and node.kind_id == content_kinds.EXERCISE:
                            sync_node_assessment_items(node, original_node)

                # Avoid cases where sort order might have overlapped
                for parent in parents_to_check:
                    sort_order = 1
                    for child in parent.children.all().order_by('sort_order', 'title'):
                        child.sort_order = sort_order
                        child.save()
                        sort_order += 1

def sync_node(node, original):
    node.title = original.title
    node.description = original.description
    node.license = original.license
    node.copyright_holder = original.copyright_holder
    node.changed = True
    node.author = original.author
    node.extra_fields = original.extra_fields
    node.save()

def sync_node_tags(node, original, channel_id):

    changed = False

    # Remove tags that aren't in original
    for tag in node.tags.exclude(tag_name__in=original.tags.values_list('tag_name', flat=True)):
        node.tags.remove(tag)
        changed = True

    # Add tags that are in original
    for tag in original.tags.exclude(tag_name__in=node.tags.values_list('tag_name', flat=True)):
        new_tag, is_new = ContentTag.objects.get_or_create(
            tag_name=tag.tag_name,
            channel_id=channel_id,
        )
        node.tags.add(new_tag)
        changed = True

    if changed:
        node.changed = True
        node.save()

def sync_node_files(node, original):

    changed = False

    # Delete files that aren't in original
    node.files.exclude(checksum__in=original.files.values_list('checksum', flat=True)).delete()

    # Add files that are in original
    for f in original.files.all():
        # Remove any files that are already attached to node
        original_file = node.files.filter(preset_id=f.preset_id).first()
        if original_file:
            if original_file.checksum == f.checksum: # No need to copy file- nothing has changed
                continue
            original_file.delete()
            changed = True

        fcopy = copy.copy(f)
        fcopy.id = None
        fcopy.contentnode = node
        fcopy.save()
        changed = True

    if changed:
        node.changed = True
        node.save()

def sync_node_assessment_items(node, original):
    node.extra_fields = original.extra_fields
    node.changed = True
    node.save()

    # Clear assessment items on node
    node.assessment_items.all().delete()

    # Add assessment items onto node
    for ai in original.assessment_items.all():
        ai_copy = copy.copy(ai)
        ai_copy.id = None
        ai_copy.contentnode = node
        ai_copy.save()
        for f in ai.files.all():
            f_copy = copy.copy(f)
            f_copy.id = None
            f_copy.assessment_item = ai_copy
            f_copy.save()
