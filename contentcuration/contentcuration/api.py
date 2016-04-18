"""
This module acts as the only interface point between other apps and the database backend for the content.
It exposes several convenience functions for accessing content
"""
from functools import wraps

from django.core.files import File as DjFile
from django.db.models import Q
from kolibri.content import models as KolibriContent
from kolibri.content.utils import validate
from kolibri.content.api import *

def count_children(node):
    count = node.children.count()
    for n in node.children.all():
        count += count_children(n)
    return count

def get_total_size(node):
    total_size = 0
    if node.kind == "topic":
        for n in node.children.all():
            total_size += get_total_size(n)
    else:
        total_size = node.total_file_size
    return total_size