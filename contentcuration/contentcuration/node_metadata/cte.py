from django.db.models.expressions import F
from django.db.models.sql.constants import LOUTER
from django_cte import With
from le_utils.constants import content_kinds

from contentcuration.models import ContentNode


class MetadataCTE(object):
    columns = []

    def __init__(self, node_pks):
        """
        :param node_pks: list of ContentNode ID's
        """
        self.node_pks = node_pks
        self.cte = None

    def add_columns(self, columns):
        self.columns.extend(columns)

    def get(self):
        if self.cte is None:
            self.cte = self.build()
        return self.cte

    def build(self):
        raise NotImplementedError('Build method must create CTE')

    def join(self, query):
        raise NotImplementedError('Join method must join query with CTE')

    @property
    def col(self):
        return self.get().col


class TreeMetadataCTE(MetadataCTE):
    columns = ['tree_id']

    def build(self):
        tree_ids = ContentNode.objects.filter(pk__in=self.node_pks).values('tree_id')
        return With(
            ContentNode.objects.filter(tree_id__in=tree_ids).values(*set(self.columns)),
            name='tree_cte'
        )

    def join(self, query):
        cte = self.get()
        return cte.join(query, tree_id=cte.col.tree_id).with_cte(cte)


class FileMetadataCTE(MetadataCTE):
    columns = []

    def build(self):
        nodes = ContentNode.objects.filter(pk__in=self.node_pks)\
            .exclude(kind_id=content_kinds.TOPIC)

        columns = set(self.columns)
        files = nodes.values(
            'content_id',
            **{column: F('files__{}'.format(column)) for column in columns}
        ).distinct()
        assessment_files = nodes.values(
            'content_id',
            **{column: F('assessment_items__files__{}'.format(column)) for column in columns}
        ).distinct()

        return With(files.union(assessment_files).values(*columns), name='file_cte')

    def join(self, query):
        cte = self.get()
        return cte.join(query, content_id=cte.col.content_id, _join_type=LOUTER).with_cte(cte)


class ResourceSizeCTE(FileMetadataCTE):
    columns = ['content_id']

    def build(self):
        from contentcuration.node_metadata.annotations import RawResourceSize
        from contentcuration.node_metadata.query import Metadata

        q = Metadata(self.node_pks)

        if 'resource_size' in self.columns:
            q = q.annotate(resource_size=RawResourceSize())

        return With(q.build().values(*set(self.columns)), name='resource_size_cte')
