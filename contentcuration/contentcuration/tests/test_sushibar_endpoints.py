import functools
import json
import os

from django.urls import reverse_lazy

from .base import BaseAPITestCase
from contentcuration import models as cc


def rgetattr(obj, attr, *args):
    """
    A fancy version of `getattr` that allows getting dot-separated nested attributes
    like `license.license_name` for use in tree comparisons attribute mappings.
    via https://stackoverflow.com/a/31174427
    """

    def _getattr(obj, attr):
        return getattr(obj, attr, *args)

    return functools.reduce(_getattr, [obj] + attr.split("."))


def _get_node_attr(node, attr, attr_map=None):
    if attr_map is None:
        attr_map = {}
    if attr in attr_map:
        attr = attr_map[attr]
    if isinstance(node, cc.ContentNode):
        return rgetattr(node, attr)
    return node[attr]


def compare_node_attrs(nodeA, nodeB, attrs, mapA=None, mapB=None):
    if mapA is None:
        mapA = {}
    if mapB is None:
        mapB = {}
    diff = []
    for attr in attrs:
        attrA = _get_node_attr(nodeA, attr, mapA)
        attrB = _get_node_attr(nodeB, attr, mapB)
        if attrA != attrB:
            diff.append(attr)
    return diff


def _get_children_list(node):
    if isinstance(node, cc.ContentNode):
        return list(node.children.all())
    return node.get("children", [])


def compare_trees_children(
    nodeA, nodeB, attrs=None, mapA=None, mapB=None, recursive=True
):
    """
    Check children of nodeA and nodeB are identical.
    Args:
      - attrs (list(str)): what attributes to check in comparison
      - mapA: map of attribues in attr to nodeA attributes
      - mapB: map of attribues in attr to nodeB attributes
      - recursive (bool): check just one level of children, or all levels of children?
    """
    if attrs is None:
        attrs = ["title"]
    if mapA is None:
        mapA = {}
    if mapB is None:
        mapB = {}
    diff = []
    childrenA = _get_children_list(nodeA)
    childrenB = _get_children_list(nodeB)
    if not childrenA and not childrenB:
        return []
    if childrenA and not childrenB or not childrenA and childrenB:
        return ["different children"]
    if childrenA and childrenB:
        children_pairs = list(zip(childrenA, childrenB))
        for children_pair in children_pairs:
            childA, childB = children_pair
            children_attr_diff = compare_node_attrs(
                childA, childB, attrs=attrs, mapA=mapA, mapB=mapB
            )
            diff.extend(children_attr_diff)
            if recursive:
                children_diff = compare_trees_children(
                    childA,
                    childB,
                    attrs=attrs,
                    mapA=mapA,
                    mapB=mapB,
                    recursive=recursive,
                )
                diff.extend(children_diff)
    return diff


def get_tree_fixture(fixture_name="tree.json"):
    filepath = os.path.join(os.path.dirname(__file__), "fixtures", fixture_name)
    with open(filepath, "rb") as jsonfile:
        data = json.load(jsonfile)
    return data


class SushibarEndpointsTestCase(BaseAPITestCase):
    def setUp(self):
        super(SushibarEndpointsTestCase, self).setUp()
        self.expected_tree = get_tree_fixture(fixture_name="tree.json")
        # alternatively can check against real tree of `cc.ContentNode`s:
        # self.expected_tree = self.channel.main_tree

    def test_get_tree_data_method(self):
        main_tree = self.channel.main_tree
        tree_data = main_tree.get_tree_data()
        assert tree_data, "No tree_data returned"
        diff = compare_trees_children(
            tree_data,
            self.expected_tree,
            attrs=["title", "node_id", "kind"],
            mapB={"kind": "kind_id"},
        )
        assert not diff, "Found difference in tree structures:" + str(diff)

    def test_get_tree_data_method_alt(self):
        """
        Same as above but checks agains ContentNode model tree.
        """
        main_tree = self.channel.main_tree
        tree_data = main_tree.get_tree_data()
        assert tree_data, "No tree_data returned"
        diff = compare_trees_children(
            tree_data,
            main_tree,
            attrs=["title", "node_id", "kind"],
            mapB={"kind": "kind.pk"},
        )
        assert not diff, "Found difference in tree structures:" + str(diff)

    def test_get_tree_data_endpoint(self):
        channel_id = self.channel.id
        url = reverse_lazy("get_tree_data")
        response = self.post(url, {"channel_id": channel_id})
        assert response.status_code == 200
        response_json = response.json()
        response_json["children"] = response_json[
            "tree"
        ]  # hack because diff function checks 'children'
        del response_json["tree"]
        diff = compare_trees_children(
            response_json,
            self.expected_tree,
            attrs=["title", "node_id", "kind"],
            mapB={"kind": "kind_id"},
        )
        assert not diff, "Found difference in tree structures:" + str(diff)

    def test_get_tree_data_endpoint_errors(self):
        url = reverse_lazy("get_tree_data")
        response = self.post(url, {})
        assert response.status_code == 400
        response = self.post(url, {"channel_id": "NONEXISTENT"})
        assert response.status_code == 404
        channel_id = self.channel.id
        response = self.post(url, {"channel_id": channel_id, "tree": "NONEXISTENT"})
        assert response.status_code == 404

    def test_get_tree_data_method_onelevel(self):
        main_tree = self.channel.main_tree
        tree_data = main_tree.get_tree_data(levels=1)
        assert tree_data, "No tree_data returned"
        diff = compare_trees_children(
            tree_data,
            main_tree,
            attrs=["title", "node_id", "kind"],
            mapB={"kind": "kind_id"},
            recursive=False,
        )
        assert not diff, "Found difference in tree structures:" + str(diff)

    def test_get_node_tree_data_endpoint(self):
        channel_id = self.channel.id
        url = reverse_lazy("get_node_tree_data")
        response = self.post(url, {"channel_id": channel_id})
        assert response.status_code == 200
        response_json = response.json()
        response_json["children"] = response_json[
            "tree"
        ]  # hack because diff function checks 'children'
        del response_json["tree"]
        diff = compare_trees_children(
            response_json,
            self.expected_tree,
            attrs=["title", "node_id", "kind"],
            mapB={"kind": "kind_id"},
            recursive=False,
        )
        assert not diff, "Found difference in tree structures:" + str(diff)

    def test_get_node_tree_data_endpoint_nonroot(self):
        channel_id = self.channel.id
        node = self.channel.main_tree.children.all()[0]
        url = reverse_lazy("get_node_tree_data")
        response = self.post(url, {"channel_id": channel_id, "node_id": node.node_id})
        assert response.status_code == 200
        response_json = response.json()
        response_json["children"] = response_json[
            "tree"
        ]  # hack because diff function checks 'children'
        del response_json["tree"]
        diff = compare_trees_children(
            response_json,
            node,
            attrs=["title", "node_id", "kind"],
            mapB={"kind": "kind_id"},
            recursive=False,
        )
        assert not diff, "Found difference in tree structures:" + str(diff)
