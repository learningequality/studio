from contentcuration.models import ContentNode
from contentcuration.node_metadata.annotations import MetadataAnnotation


class Metadata(object):
    """
    Helper class to query for various ContentNode metadata, for multiple node-trees, while
    minimizing database query volume.

    Example:
        md = Metadata(['123...abc']).annotate(some_thing=MetadataAnnotation())
        data = md.get('123...abc')
    """
    def __init__(self, queryset_or_model, **annotations):
        """
        :param queryset_or_model: A ContentNode or queryset
        :param annotations: A dict of annotations
        """
        if isinstance(queryset_or_model, ContentNode):
            self.query = ContentNode.objects.filter(pk=queryset_or_model.pk)
        else:
            self.query = queryset_or_model
        self.annotations = annotations
        self.metadata = None

    def annotate(self, **annotations):
        """
        :param annotations: Dict of annotations that should be instances of MetadataAnnotation
        :return: A clone of Metadata with the new annotations
        """
        clone = Metadata(self.query, **self.annotations)
        clone.annotations.update(annotations)
        return clone

    def get(self, node_pk):
        """
        A dict of metadata for the node identified by `node_pk`
        :param node_pk: An int
        :return: A dict of metadata for the node identified by `node_pk`
        """
        if self.metadata is None:
            self.metadata = {}
            query = self.build()

            # Finally, clear ordering (MPTT adds ordering by default)
            for row in query:
                self.metadata.update({row.pop('id'): row})

        return self.metadata.get(node_pk, None)

    def build(self):
        """
        :return: A dict of the metadata indexed by the node's ID
        """
        if len(self.annotations) == 0:
            raise ValueError('No metadata to retrieve')

        ctes = []

        for field_name, annotation in self.annotations.items():
            if not isinstance(annotation, MetadataAnnotation) or annotation.cte is None:
                continue

            if any(isinstance(cte, annotation.cte) for cte in ctes):
                cte = next(cte for cte in ctes if isinstance(cte, annotation.cte))
            else:
                cte = annotation.cte(self.query)
                ctes.append(cte)

            if annotation.cte_columns:
                cte.add_columns(list(annotation.cte_columns))

        cte = None
        query = self.query
        annotations = {}

        if len(ctes) > 0:
            for cte in ctes:
                query = cte.join(query)
                annotations.update({
                    field_name: annotation.get_annotation(cte)
                    for field_name, annotation in self.annotations.items()
                    if isinstance(annotation, MetadataAnnotation)
                    and annotation.cte and isinstance(cte, annotation.cte)
                })

        annotations.update({
            field_name: annotation.get_annotation(cte)
            for field_name, annotation in self.annotations.items()
            if not isinstance(annotation, MetadataAnnotation) or annotation.cte is None
        })

        # Finally, clear ordering (MPTT adds ordering by default)
        return query.values('id').annotate(**annotations).order_by()
