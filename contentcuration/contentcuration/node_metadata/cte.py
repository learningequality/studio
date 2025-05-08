from django.db.models import IntegerField
from django.db.models.aggregates import Count
from django.db.models.aggregates import Sum
from django.db.models.expressions import Case
from django.db.models.expressions import F
from django.db.models.expressions import Value
from django.db.models.expressions import When
from django.db.models.functions import Coalesce
from django.db.models.sql.constants import LOUTER
from django_cte import With
from le_utils.constants import content_kinds

from contentcuration.db.models.expressions import BooleanComparison
from contentcuration.db.models.expressions import WhenQ
from contentcuration.models import ContentNode


class MetadataCTE(object):
    columns = []

    def __init__(self, queryset):
        """
        :param queryset: A ContentNode queryset
        """
        self.query = queryset
        self.cte = None

    def add_columns(self, columns):
        self.columns.extend(columns)

    def get(self):
        if self.cte is None:
            self.cte = self.build()
        return self.cte

    def build(self):
        raise NotImplementedError("Build method must create CTE")

    def join(self, query):
        raise NotImplementedError("Join method must join query with CTE")

    @property
    def col(self):
        return self.get().col


class LeftContentCTE(MetadataCTE):
    def join(self, query):
        cte = self.get()
        return cte.join(
            query, content_id=cte.col.content_id, _join_type=LOUTER
        ).with_cte(cte)


class TreeMetadataCTE(MetadataCTE):
    columns = ["tree_id"]

    def build(self):
        tree_ids = self.query.values("tree_id")
        return With(
            ContentNode.objects.filter(tree_id__in=tree_ids).values(*set(self.columns)),
            name="tree_cte",
        )

    def join(self, query):
        cte = self.get()
        return cte.join(query, tree_id=cte.col.tree_id).with_cte(cte)


class AssessmentCountCTE(LeftContentCTE):
    columns = ["content_id"]

    def build(self):
        q = self.query.filter(
            kind_id=content_kinds.EXERCISE, assessment_items__deleted=False
        ).annotate(assessment_count=Count(F("assessment_items__id"), distinct=True))

        return With(q.values(*set(self.columns)), name="assessment_count_cte")


class FileMetadataCTE(LeftContentCTE):
    columns = []

    def build(self):
        nodes = self.query.exclude(kind_id=content_kinds.TOPIC)

        columns = set(self.columns)
        files = nodes.values(
            "content_id",
            **{column: F("files__{}".format(column)) for column in columns}
        ).distinct()
        assessment_files = nodes.values(
            "content_id",
            **{
                column: F("assessment_items__files__{}".format(column))
                for column in columns
            }
        ).distinct()

        return With(files.union(assessment_files).values(*columns), name="file_cte")


class ResourceSizeCTE(LeftContentCTE):
    columns = ["content_id"]

    def build(self):
        """
        Creates special nested CTE since all other metadata works of nodes, and joining on multiple
        file records would produce incorrect result for resource sizes due to summing.
        """
        files_cte = FileMetadataCTE(self.query)
        files_cte.add_columns(("file_size", "checksum"))

        resource_condition = BooleanComparison(
            F("kind_id"), "!=", Value(content_kinds.TOPIC)
        )

        q = files_cte.join(self.query).annotate(
            resource_size=Sum(
                Case(
                    # aggregate file_size when selected node is not a topic
                    When(
                        condition=WhenQ(resource_condition),
                        then=Coalesce(files_cte.col.file_size, Value(0)),
                    ),
                    default=Value(0),
                ),
                output_field=IntegerField(),
            )
        )

        return With(q.values(*set(self.columns)), name="resource_size_cte")
