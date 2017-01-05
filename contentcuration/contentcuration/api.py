"""
This module acts as the only interface point between other apps and the database backend for the content.
"""
import logging
import os
import re
import hashlib
import shutil
import tempfile
import subprocess
from functools import wraps
from django.db.models import Q, Value
from django.db.models.functions import Concat
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, SuspiciousOperation
from django.core.files import File as DjFile
from django.http import HttpResponse
from kolibri.content import models as KolibriContent
from le_utils.constants import format_presets, content_kinds, file_formats
import contentcuration.models as models

def check_supported_browsers(user_agent_string):
    for browser in settings.SUPPORTED_BROWSERS:
        if browser in user_agent_string:
            return True
    return False

def write_file_to_storage(fobj, check_valid = False, name=None):
    # Check that hash is valid
    checksum = hashlib.md5()
    for chunk in iter(lambda: fobj.read(4096), b""):
        checksum.update(chunk)
    name = name if name is not None else fobj._name if fobj._name else ""
    filename, ext = os.path.splitext(name) if name is not None else ("", "")
    hashed_filename = checksum.hexdigest()
    full_filename = "{}{}".format(hashed_filename, ext)
    fobj.seek(0)

    if check_valid and hashed_filename != filename:
        raise SuspiciousOperation("Failed to upload file {0}: hash is invalid".format(name))

    # Get location of file
    file_path = models.generate_file_on_disk_name(hashed_filename, full_filename)

    # Write file
    with open(file_path, 'wb') as destf:
        shutil.copyfileobj(fobj, destf)
    return full_filename

def recurse(node, level=0):
    print ('\t' * level), node.id, node.lft, node.rght, node.title
    for child in ContentNode.objects.filter(parent=node).order_by('sort_order'):
        recurse(child, level + 1)

def clean_db():
    logging.debug("*********** CLEANING DATABASE ***********")
    for file_obj in models.File.objects.filter(Q(preset = None) & Q(contentnode=None)):
        logging.debug("Deletng unreferenced file {0}".format(file_obj.__dict__))
        file_obj.delete()
    for node_obj in models.ContentNode.objects.filter(Q(parent=None) & Q(channel_main=None) & Q(channel_trash=None) & Q(user_clipboard=None)):
        logging.debug("Deletng unreferenced node: {0}".format(node_obj.pk))
        node_obj.delete()
    for tag_obj in models.ContentTag.objects.filter(tagged_content=None):
        logging.debug("Deleting unreferenced tag: {0}".format(tag_obj.tag_name))
        tag_obj.delete()
    logging.debug("*********** DONE ***********")

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
            metadata['has_changed_descendant'] = metadata['has_changed_descendant'] or child_metadata['has_changed_descendant']

    else:
        metadata['resource_count'] = 1
        for f in node.files.values_list('file_size'):
            metadata['resource_size'] += f[0]
        metadata['max_sort_order'] = node.sort_order

    return metadata

def count_files(node):
    if node.kind_id == "topic":
        count = 0
        for n in node.children.all():
            count += count_files(n)
        return count
    return 1

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
