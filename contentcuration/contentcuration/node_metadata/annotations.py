from django.contrib.postgres.aggregates.general import ArrayAgg
from django.contrib.postgres.aggregates.general import BoolOr
from django.db.models import BooleanField
from django.db.models import CharField
from django.db.models import IntegerField
from django.db.models.aggregates import Count
from django.db.models.aggregates import Max
from django.db.models.expressions import Case
from django.db.models.expressions import F
from django.db.models.expressions import Value
from django.db.models.expressions import When
from django.db.models.functions import Coalesce
from le_utils.constants import content_kinds
from le_utils.constants import roles

from contentcuration.db.models.expressions import BooleanComparison
from contentcuration.db.models.expressions import WhenQ
from contentcuration.node_metadata.cte import AssessmentCountCTE
from contentcuration.node_metadata.cte import ResourceSizeCTE
from contentcuration.node_metadata.cte import TreeMetadataCTE


class MetadataAnnotation(object):
    cte = None
    cte_columns = ()

    def get_annotation(self, cte):
        """
        :type cte: With|None
        """
        raise NotImplementedError("Metadata annotation needs to implement this method")

    def build_kind_condition(self, kind_id, value, comparison="="):
        return [BooleanComparison(kind_id, comparison, Value(value))]

    def build_topic_condition(self, kind_id, comparison="="):
        return self.build_kind_condition(kind_id, content_kinds.TOPIC, comparison)


class AncestorAnnotation(MetadataAnnotation):
    cte = TreeMetadataCTE
    cte_columns = ("lft", "rght", "pk")

    def __init__(self, *args, **kwargs):
        self.include_self = kwargs.pop("include_self", False)
        super(AncestorAnnotation, self).__init__(*args, **kwargs)

    def build_ancestor_condition(self, cte):
        """
        @see MPTTModel.get_ancestors()
        """
        left_op = "<="
        right_op = ">="

        if not self.include_self:
            left_op = "<"
            right_op = ">"

        return [
            BooleanComparison(cte.col.lft, left_op, F("lft")),
            BooleanComparison(cte.col.rght, right_op, F("rght")),
        ]


class AncestorArrayAgg(AncestorAnnotation):
    def get_annotation(self, cte):
        ancestor_condition = self.build_ancestor_condition(cte)

        return ArrayAgg(
            Case(
                When(condition=WhenQ(*ancestor_condition), then=cte.col.pk),
                default=Value(None),
            ),
            output_field=CharField(),
        )


class DescendantCount(MetadataAnnotation):
    def get_annotation(self, cte=None):
        """
        @see MPTTModel.get_descendant_count()
        """
        return Max(
            Case(
                # when selected node is topic, use algorithm to get descendant count
                When(
                    condition=WhenQ(*self.build_topic_condition(F("kind_id"))),
                    then=(F("rght") - F("lft") - Value(1)) / Value(2),
                ),
                # integer division floors the result in postgres
                default=Value(1),
            )
        )


class DescendantAnnotation(MetadataAnnotation):
    cte = TreeMetadataCTE
    cte_columns = ("lft", "rght")

    def __init__(self, *args, **kwargs):
        self.include_self = kwargs.pop("include_self", False)
        super(DescendantAnnotation, self).__init__(*args, **kwargs)

    def build_descendant_condition(self, cte):
        """
        @see MPTTModel.get_descendants()
        """
        left_op = ">="
        right_op = "<="

        if not self.include_self:
            left_op = ">"
            right_op = "<"

        return [
            BooleanComparison(cte.col.lft, left_op, F("lft")),
            BooleanComparison(cte.col.lft, right_op, F("rght")),
        ]


class AssessmentCount(DescendantAnnotation):
    cte = AssessmentCountCTE
    cte_columns = ("content_id", "assessment_count")

    def get_annotation(self, cte):
        return Coalesce(cte.col.assessment_count, Value(0), output_field=IntegerField())


class ResourceCount(DescendantAnnotation):
    cte_columns = ("content_id", "kind_id") + DescendantAnnotation.cte_columns

    def get_annotation(self, cte):
        resource_condition = self.build_topic_condition(F("kind_id"), "!=")

        topic_condition = self.build_topic_condition(cte.col.kind_id, "!=")
        topic_condition += self.build_descendant_condition(cte)

        return Count(
            Case(
                # when selected node is not a topic, then count = 1
                When(condition=WhenQ(*resource_condition), then=F("content_id")),
                # when it is a topic, then count descendants
                When(condition=WhenQ(*topic_condition), then=cte.col.content_id),
                default=Value(None),
            ),
            distinct=True,
        )


class CoachCount(DescendantAnnotation):
    cte_columns = ("content_id", "role_visibility") + DescendantAnnotation.cte_columns

    def get_annotation(self, cte):
        topic_condition = self.build_topic_condition(F("kind_id"))
        topic_condition += self.build_descendant_condition(cte)
        topic_condition += self.build_coach_condition(cte.col.role_visibility)

        resource_condition = self.build_topic_condition(F("kind_id"), "!=")
        resource_condition += self.build_coach_condition(F("role_visibility"))

        return Count(
            Case(
                # when selected node is a coach topic, then count descendent content_id's
                When(condition=WhenQ(*topic_condition), then=cte.col.content_id),
                # when selected node is not a topic, count its content_id
                When(condition=WhenQ(*resource_condition), then=F("content_id")),
                default=Value(None),
            ),
            distinct=True,
        )

    def build_coach_condition(self, role_visibility):
        return [BooleanComparison(role_visibility, "=", Value(roles.COACH))]


class HasChanged(DescendantAnnotation):
    cte_columns = ("changed",) + DescendantAnnotation.cte_columns

    def get_annotation(self, cte):
        resource_condition = self.build_topic_condition(F("kind_id"), "!=")

        whens = [
            # when selected node is not a topic, just use its changed status
            When(condition=WhenQ(*resource_condition), then=F("changed")),
        ]

        if self.include_self:
            # when selected node is a topic and it's changed and including self, then return that
            whens.append(When(condition=WhenQ(*[F("changed")]), then=F("changed")))

        return Coalesce(
            Case(
                *whens,
                # fallback to aggregating descendant changed status when a unchanged topic
                default=BoolOr(cte.col.changed)
            ),
            Value(False),
            output_field=BooleanField(),
        )


class SortOrderMax(DescendantAnnotation):
    cte_columns = ("parent_id", "sort_order") + DescendantAnnotation.cte_columns

    def get_annotation(self, cte):
        resource_condition = self.build_topic_condition(F("kind_id"), "!=")
        topic_condition = self.build_child_condition(cte)

        return Coalesce(
            Max(
                Case(
                    # when selected node is not a topic, use its sort_order
                    When(condition=WhenQ(*resource_condition), then=F("sort_order")),
                    # when selected node is a topic, then find max of children
                    When(condition=WhenQ(*topic_condition), then=cte.col.sort_order),
                    default=Value(None),
                )
            ),
            Value(1),
            output_field=IntegerField(),
        )

    def build_child_condition(self, cte):
        return [BooleanComparison(cte.col.parent_id, "=", F("id"))]


class ResourceSize(DescendantAnnotation):
    cte = ResourceSizeCTE
    cte_columns = ("resource_size",)

    def get_annotation(self, cte):
        return Max(cte.col.resource_size, output_field=IntegerField())
