#!/usr/bin/env pytest
"""
Tests for the ContentNode model.
"""
import pytest
from mixer.backend.django import mixer

from .base import StudioTestCase
from .testdata import node
from contentcuration.models import ChannelTreeNode
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode


class GetParentTestCase(StudioTestCase):
    """
    Tests for the MPTT-based ContentNode.get_parent() method.
    """

    def setUp(self):
        super(GetParentTestCase, self).setUp()
        self.root = node({})
        self.parent = node({}, parent=self.root)
        self.child = node({}, parent=self.parent)
        # topic_kind, _created = ContentKind.objects.get_or_create(kind="Topic")

        # with mixer.ctx(commit=False), ContentNode.objects.delay_mptt_updates():
        #     self.root = mixer.blend(ContentNode, parent=None, kind=topic_kind, lft=None, rgt=None)
        #     self.root.save(force_insert=True)

        #     self.parent = mixer.blend(ContentNode, parent=self.root, kind=topic_kind, lft=None, rgt=None)
        #     self.parent.save(force_insert=True)

        #     self.child = mixer.blend(ContentNode, parent=self.parent, kind=topic_kind, lft=None, rgt=None)
        #     self.child.save(force_insert=True)

    def test_returns_parent_if_not_root_node(self):
        """
        Check that the returned node, if the instance we call it from has a parent,
        is the parent we expect.
        """
        assert self.parent.id == self.child.get_parent().id

    def test_returns_none_if_root_node(self):
        """
        Check that we return None on a root node. B/c it has no parent.
        """
        assert self.root.get_parent() is None


class AddChildTestCase(StudioTestCase):
    """
    Tests for the MPTT-based ContentNode.add_child() method.

    We want to test for compatibility with Treebeard, so most
    of these tests will be about comparing against a Treebeard
    implementation.
    """

    def setUp(self):
        super(AddChildTestCase, self).setUp()
        topic_kind, _created = ContentKind.objects.get_or_create(kind="Topic")
        self.topic_kind = topic_kind

        # Create the same tree structure in both
        # the MP-based ChannelTreeNode, and
        # the MPTT-based ContentNode.

        with mixer.ctx(commit=False), ContentNode.objects.delay_mptt_updates():
            self.root = mixer.blend(ContentNode, parent=None, kind=topic_kind, lft=None, rgt=None, tree_id=ContentNode.objects._get_next_tree_id())
            self.root.save(force_insert=True)

            self.parent = mixer.blend(ContentNode, parent_id=self.root.pk, kind=topic_kind, lft=None, rgt=None)
            self.parent.save(force_insert=True)

            self.child = mixer.blend(ContentNode, parent_id=self.parent.pk, kind=topic_kind, lft=None, rgt=None)
            self.child.save(force_insert=True)

        self.mp_root = mixer.blend(ChannelTreeNode, id=self.root.id)

        self.mp_parent = mixer.blend(ChannelTreeNode, id=self.parent.id)
        self.mp_parent.move(self.mp_root, "last-child")

        self.mp_child = mixer.blend(ChannelTreeNode, id=self.child.id)
        self.mp_child.move(self.mp_parent, "last-child")

    def test_add_child_singleton_child_same_as_mp(self):
        """
        Test that the behaviour of add_child on a node withouth children
        is the same as ChannelTreeNode.
        """
        self.child.add_child(
            id="muchtest",
            kind_id=self.topic_kind.pk
        )

        self.mp_child.add_child(
            id="muchtest",
        )

        # check each child's children's ids and make sure they're the same
        mptt_child_children_ids = sorted([c.id for c in self.child.get_children()])
        mp_child_children_ids = sorted([c.id for c in self.mp_child.get_children()])

        # check that our mptt children list isn't empty
        assert mptt_child_children_ids

        # check that our mptt children is the same as mp
        assert mptt_child_children_ids == mp_child_children_ids

    def test_we_can_add_an_already_constructed_node(self):
        """
        Test that we can add an already-constructed node
        as a child by passing it to the instance= parameter.
        """

        with mixer.ctx(commit=False), ContentNode.objects.delay_mptt_updates():

            # child tree_id is 2
            # point grandchild to GB tree
            grandchild = mixer.blend(ContentNode, kind=self.topic_kind, parent=None)
            # grandchild = ContentNode(parent=None, kind=self.topic_kind)
        self.child.add_child(instance=grandchild)

        # we need to call refresh_from_db() so that the MPTT
        # algorithm can get the new lft and rgt values. Otherwise
        # the child list will be outdated.
        self.child.refresh_from_db()

        assert self.child.get_last_child().id == grandchild.id

    def test_adds_child_to_rightmost(self):
        """
        Check that we add the child to the rightmost, e.g. the last
        in the list of children. This follows treebeard's behaviour.

        When adding children, they should be sorted by the order we insert them,
        i.e. the last child inserted is the last in the list returned by get_children()
        """
        with mixer.ctx(commit=False), ContentNode.objects.delay_mptt_updates():
            grandchild1 = mixer.blend(ContentNode, kind=self.topic_kind, rgt=None, lft=None, tree_id=None)
        self.child.add_child(instance=grandchild1)

        with mixer.ctx(commit=False), ContentNode.objects.delay_mptt_updates():
            grandchild2 = mixer.blend(ContentNode, kind=self.topic_kind, rgt=None, lft=None, tree_id=None)
        self.child.add_child(instance=grandchild2)

        # we need to call refresh_from_db() so that the MPTT
        # algorithm can get the new lft and rgt values. Otherwise
        # the child list will be outdated.
        self.child.refresh_from_db()

        children = self.child.get_children()

        # check that granchild1, the first born, comes in the list first
        assert grandchild1.id == children.first().id

        # check that grandchild2, the lastborn, comes in last
        assert grandchild2.id == children.last().id


class MoveTestCase(StudioTestCase):
    """
    Tests for ContentNode.move().
    """

    def setUp(self):
        self.node = node()

    def test_raises_error_when_given_invalid_pos(self):
        """
        Test that giving a nonsense pos argument to move() raises an error.
        """
        root = node()

        with pytest.raises(AssertionError):
            self.node.move(root, pos="nonsense")

    def test_first_child_moves_to_first_child(self):
        """
        Check that giving pos="first-child" moves the node to the target's first child.
        """

        # add some children to self.node
        for _ in range(5):
            n = node(save=False)
            self.node.add_child(instance=n)

        # add a new child using move(pos="first-child").
        new_child = node()
        new_child.move(self.node, pos="first-child")
        new_child.refresh_from_db()

        assert new_child.pk == self.node.get_children().first().pk

    def test_last_child_moves_to_last_child(self):
        """
        Check that giving pos="last-child" moves the node to be the target's last of its children.
        """

        # add some children to self.node
        for _ in range(5):
            n = node(save=False)
            self.node.add_child(instance=n)

        # add a new child using move(pos="first-child").
        # with mixer.ctx(commit=False):
        new_child = node()
        # new_child.save(force_insert=True)
        new_child.move(self.node, pos="last-child")
        new_child.refresh_from_db()

        children = self.node.get_children()
        assert new_child.pk == children.last().pk

    def test_left_moves_to_left_of_target(self):
        """
        Check that giving pos="left" moves the node to the left of the target.
        """

        # move the self.node to another root node first, so other root nodes
        # don't interfere with our testing
        root = node()
        self.node.move(root, pos="first-child")

        new_node = node()
        new_node.move(self.node, pos="left")

        # check that the new node is the very first, i.e. to the left of self.node
        assert new_node.pk == self.node.get_previous_sibling().pk

    def test_left_moves_to_right_of_target(self):
        """
        Check that giving pos="right" moves the node to the left of the target.
        """

        # move the self.node to another root node first, so other root nodes
        # don't interfere with our testing
        root = node()
        self.node.move(root, pos="first-child")

        new_node = node()
        new_node.move(self.node, pos="right")

        # check that the new node is the very first, i.e. to the left of self.node
        assert new_node.pk == self.node.get_next_sibling().pk


class AddSiblingTestCase(StudioTestCase):
    """
    Tests for ContentNode.add_sibling().
    """

    def setUp(self):
        super(AddSiblingTestCase, self).setUp()

        self.root = node()
        self.node = node(parent=self.root)

    def test_left_adds_to_the_left_of_node(self):
        """
        Check that when we call add_sibling(pos=left), it adds to the left of self.node.
        """
        new_node = node(save=False)
        self.node.add_sibling(instance=new_node, pos="left")

        # Check that the node to the left of self.node is our new_node
        assert self.node.get_previous_sibling().pk == new_node.pk

    def test_right_adds_to_the_right_of_node(self):
        """
        Check that when we call add_sibling(pos=right), it adds to the right of self.node.
        """
        new_node = node(save=False)
        self.node.add_sibling(instance=new_node, pos="right")

        # Check that the node to the right of self.node is new_node
        assert self.node.get_next_sibling().pk == new_node.pk

    def test_first_sibling_adds_node_to_the_very_first(self):
        """
        Check that calling add_sibling(pos=first-sibling) adds the new node to the very first of self.node's siblings
        """

        new_node = node(save=False)
        self.node.add_sibling(instance=new_node, pos="first-sibling")

        assert self.node.get_siblings().first().pk == new_node.pk

    def test_last_sibling_adds_node_to_the_very_last(self):
        """
        Check that calling add_sibling(pos=last-sibling) adds the new node to the very last of self.node's siblings
        """

        new_node = node(save=False)
        self.node.add_sibling(instance=new_node, pos="last-sibling")

        assert self.node.get_siblings().last().pk == new_node.pk

    def test_kwargs_sets_up_a_valid_sibling_node(self):
        """All the above tests use the instance parameter to create the sibling node.
        Test that using kwargs to add a sibling also works.
        """
        node_values = node(save=False)
        new_node = self.node.add_sibling(
            pos="left",
            title=node_values.title,
            kind_id=node_values.kind_id,
        )

        assert self.node.get_previous_sibling().pk == new_node.pk
