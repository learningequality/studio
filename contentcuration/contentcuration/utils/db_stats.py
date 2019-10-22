from django.conf import settings
from django.db.models import Count
from django.db.models import Q

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import User


def count_info_values(field):
    """
    Returns a count of each distinct value in the passed in field. (e.g. uses = {'storage': 15, ...})
    :param field: Name of the field to return results for.
    :return: A dict of field value keys, with counts as values.
    """
    users = User.objects.exclude(Q(information__isnull=True))
    items = users.values_list('information')
    results = {}
    for item in items:
        if field in item[0]:
            for value in item[0][field]:
                value = value.strip()
                if not value in results:
                    results[value] = 0
                results[value] += 1
    return results


def sort_items_by_count(items):
    """
    Takes a dictionary of items, and returns a list of items sorted by count.
    :param items: A dictionary in {choice: count} format.
    :return: A list of (choice, count) tuples sorted by count descending.
    """
    return sorted([(item, items[item]) for item in items],
           key=lambda x: -x[1])


def get_user_countries():
    """
    Gets count of users who wish to use Studio / Kolibri in each country.
    :return: A dict in {location: count} format.
    """
    return count_info_values('locations')


def get_studio_uses():
    """
    Gets count of users who wish to use Studio for a particular use.
    :return: A dict in {use: count} format.
    """
    return count_info_values('uses')


def get_user_heard_from():
    """
    Gets a count of sources from which our users heard about us.
    :return: A dict in {source: count} format.
    """
    return count_info_values('heard_from')


def get_user_organizations():
    """
    Gets a count of organizations that our users work for.
    :return: A dict in {organization: count} format.
    """
    return count_info_values('organization')


def get_user_stats():
    """
    Returns statistics about our users and the information they have provided to us.
    :return: A dictionary with a set of statistics.
    """

    users = User.objects.all()
    stats = {
        'count': users.count(),
        'locations': get_user_countries(),
        'uses': get_studio_uses(),
        'heard_from': get_user_heard_from(),
        'organizations': get_user_organizations()
    }

    return stats


def get_field_values_sorted(model, field):
    """
    Get a set of distinct field values, then count them up and sort them by frequency.
    :param model: The model that holds the field.
    :param field: The field whose values you wish to sort by count.
    :return: A list of (field_value, count) tuples in descending order.
    """
    values = model.values_list(field).order_by(field).annotate(count=Count(field))
    results = {}
    for value in values:
        results[value[0]] = value[1]
    return sort_items_by_count(results)


def get_channel_stats():
    """
    Get statistics about our channels.
    :return: A dictionary containing channel statistics divided into public, private, and deleted categories.
    """
    all_channels = Channel.objects.all()
    channels = all_channels.exclude(deleted=True)
    deleted = all_channels.filter(deleted=True)
    public = channels.filter(public=True)
    private = channels.exclude(public=True).exclude(id=settings.ORPHANAGE_ROOT_ID)

    deleted_ids = deleted.values_list('id', flat=True)
    public_ids = public.values_list('main_tree__tree_id', flat=True)
    private_ids = private.values_list('main_tree__tree_id', flat=True)

    deleted_nodes = ContentNode.objects.filter(original_channel_id__in=deleted_ids)
    public_nodes = ContentNode.objects.filter(tree_id__in=public_ids)
    private_nodes = ContentNode.objects.filter(tree_id__in=private_ids)

    public_channel_ids = public.values_list('id', flat=True)
    # Filter out private channel nodes copied from public channels
    # so they don't end up in the private node count.
    # We can then get copied node count by subtracting public and private nodes from the total:
    # copied = count - public_count - private_count
    private_nodes = private_nodes.exclude(original_channel_id__in=public_channel_ids)

    stats = {
        'count': Channel.objects.all().count(),
        'public': {
            'count': public.count(),
            'languages': get_field_values_sorted(public, 'language'),
            'node_count': public_nodes.count()
        },
        'deleted': {
            'count': deleted.count(),
            'languages': get_field_values_sorted(deleted, 'language'),
            'node_count': deleted_nodes.count()
        },
        'private': {
            'count': private.count(),
            'languages': get_field_values_sorted(private, 'language'),
            'node_count': private_nodes.count(),
        }
    }

    return stats


def get_content_stats():
    """
    Gets statistics about the content nodes users are creating.
    :return: A dict with content node statistics.
    """
    deleted_trees = Channel.objects.filter(deleted=True).values_list('main_tree__tree_id', flat=True)
    nodes = ContentNode.objects.exclude(tree_id__in=deleted_trees)
    # exclude the orphanage tree from stats, if it exists
    try:
        orphanage = Channel.objects.get(id=settings.ORPHANAGE_ROOT_ID)
        nodes = nodes.exclude(tree_id=orphanage.main_tree.tree_id)
    except:
        pass

    stats = {
        'count': nodes.count(),
        'kinds': get_field_values_sorted(nodes, 'kind'),
        'licenses': get_field_values_sorted(nodes, 'license'),
    }

    return stats
