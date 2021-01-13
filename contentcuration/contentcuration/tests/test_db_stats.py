import random

from .base import StudioTestCase
from .testdata import channel
from .testdata import random_string
from .testdata import user
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import Language
from contentcuration.utils.db_stats import get_channel_stats
from contentcuration.utils.db_stats import get_content_stats
from contentcuration.utils.db_stats import get_user_stats
from contentcuration.utils.db_stats import sort_items_by_count

USAGES = [
    ('organization and alignment', "Organizing or aligning existing materials"),
    ('finding and adding content', "Finding and adding additional content sources"),
    ('sequencing', "Sequencing materials using prerequisites"),
    ('exercise creation', "Creating exercises"),
    ('sharing', "Sharing materials publicly"),
    ('storage', "Storing materials for private or local use"),
    ('tagging', "Tagging content sources for discovery"),
    ('other', "Other"),
]

SOURCES = [
    ('organization', "Organization"),
    ('website', "Learning Equality Website"),
    ('newsletter', "Learning Equality Newsletter"),
    ('community forum', "Learning Equality Community Forum"),
    ('github', "Learning Equality GitHub"),
    ('social media', "Social Media"),
    ('conference', "Conference"),
    ('conversation', "Conversation with Learning Equality"),
    ('demo', "Personal Demo"),
    ('other', "Other"),
]

COUNTRIES = [
    ('Country 1', 'Country 1'),
    ('Country 2', 'Country 2'),
    ('Country 3', 'Country 3'),
    ('Country 4', 'Country 4'),
    ('Country 5', 'Country 5'),
]


def add_random_choices(choices, stats):
    """
    Given randomly choose 4 options from choices. It also records data about
    the choices in stats so we can ensure the generated stats are accurate.

    :param choices: A list of (key, value) pairs to choose from.
    :param stats: A dict in the format of {choice: count} to record choices to.
    :return: A list containing randomly chosen options from choices.
    """
    choices = [random.choice(choices)[0] for _ in range(4)]
    for choice in choices:
        if choice not in stats:
            stats[choice] = 0
        stats[choice] += 1

    return choices


class DBStatsTestCase(StudioTestCase):
    def test_empty_db_stats(self):
        """
        Test empty db stats. Note that one user already exists.
        """
        stats = get_user_stats()
        for stat in stats:
            if stat == 'count':
                assert stats[stat] == 1
            else:
                assert len(stats[stat]) == 0

    def test_user_with_info(self):
        """
        Test that correct user data is included in the get_user_stats call.
        """
        uses_stats = {}
        sources_stats = {}
        country_stats = {}
        for rando in range(10):
            email = '{}@{}.com'.format(random_string(), random_string())
            test_user = user(email)
            info = {}
            info['uses'] = add_random_choices(USAGES, uses_stats)
            info['heard_from'] = add_random_choices(SOURCES, sources_stats)
            info['locations'] = add_random_choices(COUNTRIES, country_stats)
            test_user.information = info
            test_user.save()

        stats = get_user_stats()
        assert stats['count'] == 11

        assert stats['heard_from'] == sources_stats
        assert stats['locations'] == country_stats
        assert stats['uses'] == uses_stats

    def test_sort_items_by_count(self):
        """
        Test that sort_items_by_count takes a dictionary of choices and choice counts,
        and returns a list of tuples sorted by number of times chosen descending.
        """
        uses_stats = {}
        for _ in range(10):
            add_random_choices(USAGES, uses_stats)

        sorted_stats = sort_items_by_count(uses_stats)
        count = -1
        for choice in sorted_stats:
            if count != -1:
                assert count >= choice[1], "wrong sort order: {}".format(sorted_stats)
            count = choice[1]

    def test_channel_stats_empty(self):
        """
        Test that calling get_channel_stats on an empty db returns successfully
        with no stats data.
        """
        stats = get_channel_stats()
        assert stats['deleted']['count'] == 0
        assert stats['public']['count'] == 0
        assert stats['private']['count'] == 0

    def test_channel_stats(self):
        """
        Test that correct channel data is included in the get_channel_stats call.
        """
        num_channels = 10
        num_public = 0
        lang = Language.objects.all().first()
        for _ in range(num_channels):
            c = channel(name=random_string(20))
            c.language = lang
            public = bool(random.randint(0, 1))
            if public:
                num_public += 1
                c.public = public
            c.save()
        assert num_public > 0

        num_private = num_channels - num_public
        public_ids = Channel.objects.filter(public=True).values_list('main_tree__tree_id', flat=True)
        public_node_count = ContentNode.objects.filter(tree_id__in=public_ids).count()

        stats = get_channel_stats()
        assert stats['deleted']['count'] == 0
        assert stats['public']['count'] == num_public
        assert stats['public']['node_count'] == public_node_count
        assert stats['public']['languages'] == [(lang.lang_code, num_public)]
        assert stats['private']['count'] == num_private
        assert stats['private']['languages'] == [(lang.lang_code, num_private)]

    def test_content_stats_clean(self):
        """
        Test content stats with a clean db.
        """
        stats = get_content_stats()
        assert stats['count'] == 3
        assert stats['kinds'] == [('topic', 3)]
        assert stats['licenses'] == [(None, 0)]
