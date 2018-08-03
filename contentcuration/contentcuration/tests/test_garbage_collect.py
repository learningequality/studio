#!/usr/bin/env python
from cStringIO import StringIO
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.core.files.base import ContentFile

from contentcuration.models import ContentNode, File
from contentcuration.utils.garbage_collect import clean_up_contentnodes

from base import StudioTestCase


THREE_MONTHS_AGO = datetime.now() - timedelta(days=93)


def _create_expired_contentnode(creation_date=THREE_MONTHS_AGO):
    c = ContentNode.objects.create(
        kind_id="topic",
        title="test",
        modified=creation_date,
        created=creation_date,
        parent_id=settings.ORPHANAGE_ROOT_ID,
    )
    # Use q queryset.update() to bypass auto_now's forced setting of
    # created to now()
    ContentNode.objects.filter(pk=c.pk).update(
        created=creation_date,
        modified=creation_date,
    )
    return c


class CleanUpContentNodesTestCase(StudioTestCase):

    def test_delete_all_contentnodes_in_orphanage_tree(self):
        """
        Make sure that by default, all nodes created with a timestamp of 3 months
        ago doesn't exist anymore.
        """

        # create our contentnodes that will go under our garbage tree
        num_contentnodes = 3
        for _ in range(num_contentnodes):
            _create_expired_contentnode()

        garbage_tree = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # sanity check to see if we have X contentnodes under the garbage tree
        assert garbage_tree.get_descendant_count() == num_contentnodes

        # now clean up our contentnodes, and check that our descendant count is indeed 0 now
        clean_up_contentnodes()
        garbage_tree.refresh_from_db()
        assert garbage_tree.get_descendant_count() == 0


    def test_deletes_associated_files(self):
        c = _create_expired_contentnode()
        f = File.objects.create(
            contentnode_id=c.pk,
            file_on_disk=ContentFile("test"),
            checksum="aaa",
        )
        f.file_on_disk.save("aaa.jpg", ContentFile("aaa"))
        file_url = f.file_on_disk.url

        # check that file_url exists before cleaning up
        requests.head(file_url).raise_for_status()
        clean_up_contentnodes()

        # there should be no file object in the DB
        assert File.objects.count() == 0

    def test_doesnt_delete_nonorphan_files_and_contentnodes(self):
        """
        Make sure that clean_up_contentnodes doesn't touch non-orphan files and
        contentnodes. Bad things will happen if we do.
        """
        # this legit tree, since it's not attached to our
        # orphan tree, should still exist after cleanup
        legit_tree = ContentNode.objects.create(
            kind_id="Topic",
        )
        # this file should still be here too since we attach
        # it to our legit tree
        f = File.objects.create(
            contentnode=legit_tree,
        )

        # this node should be gone
        expired_node = _create_expired_contentnode()

        # do our cleanup!
        clean_up_contentnodes()

        # assert that out expired node doesn't exist
        assert not ContentNode.objects.filter(pk=expired_node.pk).exists()

        # assert that our legit tree still exists
        assert ContentNode.objects.filter(pk=legit_tree.pk).exists()
        assert File.objects.filter(pk=f.pk).exists()

    def test_doesnt_delete_old_legit_tree(self):
        """
        Make sure we don't delete an old content tree, as long as it's not under the
        orphan tree.
        """

        # orphan node. This shouldn't exist anymore at the end of our test.
        orphan_node = _create_expired_contentnode()

        # our old, but not orphaned tree. This should exist at the end of our test.
        legit_node = ContentNode.objects.create(
            kind_id="Topic",
        )
        # mark the legit_node as old
        ContentNode.objects.filter(pk=legit_node.pk).update(
            created=THREE_MONTHS_AGO,
            modified=THREE_MONTHS_AGO,
        )

        clean_up_contentnodes()

        # is our orphan gone? :(
        assert not ContentNode.objects.filter(pk=orphan_node.pk).exists()
        # is our senior, legit node still around? :)
        assert ContentNode.objects.filter(pk=legit_node.pk).exists()

