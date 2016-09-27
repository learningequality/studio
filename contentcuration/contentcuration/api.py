"""
This module acts as the only interface point between other apps and the database backend for the content.
It exposes several convenience functions for accessing content
"""
import logging
import os
from functools import wraps
from django.core.files import File as DjFile
from django.db.models import Q, Value
from django.db.models.functions import Concat
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from kolibri.content import models as KolibriContent
from django.db import transaction
import models

def recurse(node, level=0):
    print ('\t' * level), node.id, node.lft, node.rght, node.title
    for child in ContentNode.objects.filter(parent=node).order_by('sort_order'):
        recurse(child, level + 1)

def clean_db():
    print "*********** CLEANING DATABASE ***********"
    for file_obj in models.File.objects.filter(Q(preset = None) | Q(contentnode=None)):
        print "Deletng unreferenced file", file_obj
        file_obj.delete()
    for node_obj in models.ContentNode.objects.filter(Q(parent=None) & Q(channel_main=None) & Q(channel_trash=None) & Q(user_clipboard=None)):
        print "Deletng unreferenced node", node_obj.pk
        node_obj.delete()
    for tag_obj in models.ContentTag.objects.filter(tagged_content=None):
        print "Deleting unreferenced tag", tag_obj.tag_name
        tag_obj.delete()
    print "*********** DONE ***********"

def calculate_node_metadata(node):
    metadata = {
        "total_count" : node.children.count(),
        "resource_count" : 0,
        "max_sort_order" : 1,
        "resource_size" : 0,
        "has_changed_descendant" : node.changed
    }

    if node.kind_id == "topic":
        for n in node.children.all():
            metadata['max_sort_order'] = max(n.sort_order, metadata['max_sort_order'])
            child_metadata = calculate_node_metadata(n)
            metadata['total_count'] += child_metadata['total_count']
            metadata['resource_size'] += child_metadata['resource_size']
            metadata['resource_count'] += child_metadata['resource_count']
            if child_metadata['has_changed_descendant']:
                metadata['has_changed_descendant'] = True

    else:
        metadata['resource_count'] = 1
        for f in node.files.all():
            metadata['resource_size'] += f.file_size
        metadata['max_sort_order'] = node.sort_order
    return metadata

def count_files(node):
    if node.kind_id == "topic":
        count = 0
        for n in node.children.all():
            count += count_files(n)
        return count
    return 1

    # For some reason, this returns sibling desendants too
    # return node.get_descendants(include_self=False).exclude(kind_id="topic").count()

def count_all_children(node):
    count = node.children.count()
    for n in node.children.all():
        count += count_all_children(n)
    return count

def get_total_size(node):
    total_size = 0
    if node.kind_id == "topic":
        for n in node.children.all():
            total_size += get_total_size(n)
    else:
        for f in node.files.all():
            total_size += f.file_size
    return total_size

def get_node_siblings(node):
    siblings = []
    for n in node.get_siblings(include_self=False):
        siblings.append(n.title)
    return siblings

def get_node_ancestors(node):
    ancestors = []
    for n in node.get_ancestors():
        ancestors.append(n.id)
    return ancestors

def get_child_names(node):
    names = []
    for n in node.get_children():
        names.append({"title": n.title, "id" : n.id})
    return names

def batch_add_tags(request):
    # check existing tag and subtract them from bulk_create
    insert_list = []
    tag_names = request.POST.getlist('tags[]')
    existing_tags = models.ContentTag.objects.filter(tag_name__in=tag_names)
    existing_tag_names = existing_tags.values_list('tag_name', flat=True)
    new_tag_names = set(tag_names) - set(existing_tag_names)
    for name in new_tag_names:
        insert_list.append(models.ContentTag(tag_name=name))
    new_tags = models.ContentTag.objects.bulk_create(insert_list)

    # bulk add all tags to selected nodes
    all_tags = set(existing_tags).union(set(new_tags))
    ThroughModel = models.Node.tags.through
    bulk_list = []
    node_pks = request.POST.getlist('nodes[]')
    for tag in all_tags:
        for pk in node_pks:
            bulk_list.append(ThroughModel(node_id=pk, contenttag_id=tag.pk))
    ThroughModel.objects.bulk_create(bulk_list)

    return HttpResponse("Tags are successfully saved.", status=200)

def get_file_diff(file_list):
    in_db_list = models.File.objects.annotate(filename=Concat('checksum', Value('.'),  'file_format')).filter(filename__in=file_list).values_list('filename', flat=True)
    to_return = list(set(file_list) - set(in_db_list))
    return to_return


""" CHANNEL CREATE FUNCTIONS """
def api_create_channel(channel_data, content_data, file_data):
        channel = create_channel(channel_data) # Set up initial channel
        root_node = init_staging_tree(channel) # Set up initial staging tree
        with transaction.atomic():
            convert_data_to_nodes(content_data, root_node, file_data) # converts dict to django models
            update_channel(channel, root_node)
        return channel # Return new channel

def create_channel(channel_data):
    channel = models.Channel.objects.get_or_create(id=channel_data['id'])[0]
    channel.name = channel_data['name']
    channel.description=channel_data['description']
    channel.thumbnail=channel_data['thumbnail']
    channel.deleted = False
    channel.save()
    return channel

def init_staging_tree(channel):
    channel.staging_tree = models.ContentNode.objects.create(title=channel.name + " staging", kind_id="topic", sort_order=0)
    channel.staging_tree.save()
    channel.save()
    return channel.staging_tree

def convert_data_to_nodes(content_data, parent_node, file_data):
    for node_data in content_data:
        new_node = create_node(node_data, parent_node)
        map_files_to_node(new_node, node_data['files'], file_data)
        create_exercises(new_node, node_data['questions'])
        convert_data_to_nodes(node_data['children'], new_node, file_data)

def create_node(node_data, parent_node):
    title=node_data['title']
    node_id=node_data['id']
    description=node_data['description']
    author = node_data['author']
    kind = models.ContentKind.objects.get(kind=node_data['kind'])
    extra_fields = node_data['extra_fields']
    license = None
    license_name = node_data['license']
    if license_name is not None:
        try:
            license = models.License.objects.get(license_name__iexact=license_name)
        except ObjectDoesNotExist:
            raise ObjectDoesNotExist("Invalid license found")

    return models.ContentNode.objects.create(
        title=title,
        kind=kind,
        node_id=node_id,
        description = description,
        author=author,
        license=license,
        parent = parent_node,
        extra_fields=extra_fields,
    )

def map_files_to_node(node, data, file_data):

    for f in data:
        file_hash = f.split(".")
        kind_preset = models.FormatPreset.objects.filter(kind=node.kind, allowed_formats__extension__contains=file_hash[1]).first()

        file_obj = models.File(
            checksum=file_hash[0],
            contentnode=node,
            file_format_id=file_hash[1],
            original_filename=file_data[f]['original_filename'],
            source_url=file_data[f]['source_url'],
            file_size = file_data[f]['size'],
            file_on_disk=DjFile(open(models.generate_file_on_disk_name(file_hash[0], f), 'rb')),
            preset=kind_preset,
        )
        file_obj.save()

def create_exercises(node, data):
    with transaction.atomic():
        order = 0

        for question in data:
            question_obj = models.AssessmentItem(
                type = question.get('type'),
                question = question.get('question'),
                help_text = question.get('help_text'),
                answers = question.get('answers'),
                order = ++order,
                contentnode = node,
                assessment_id = question.get('assessment_id'),
            )
            question_obj.save()

def update_channel(channel, root):
    channel.main_tree = root
    channel.version += 1
    channel.save()