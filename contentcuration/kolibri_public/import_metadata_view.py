"""
This is a copy with modifications of the file:
https://github.com/learningequality/kolibri/blob/c7417e1d558a1e1e52ac8423927d61a0e44da576/kolibri/core/content/public_api.py
"""
from uuid import UUID

from django.db import connection
from django.db.models import Q
from django.http import HttpResponseBadRequest
from django.utils.decorators import method_decorator
from kolibri_content import base_models
from kolibri_content import models as kolibri_content_models
from kolibri_content.constants.schema_versions import CONTENT_SCHEMA_VERSION  # Use kolibri_content
from kolibri_content.constants.schema_versions import MIN_CONTENT_SCHEMA_VERSION  # Use kolibri_content
from kolibri_public import models  # Use kolibri_public models
from kolibri_public.views import metadata_cache
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet


def _get_kc_and_base_models(model):
    try:
        kc_model = getattr(kolibri_content_models, model.__name__)
        base_model = getattr(base_models, model.__name__)
    except AttributeError:
        # This will happen if it's a M2M through model, which only exist on ContentNode
        through_model_name = model.__name__.replace("ContentNode_", "")
        kc_model = getattr(kolibri_content_models.ContentNode, through_model_name).through
        # Through models are not defined for the abstract base models, so we just cheat and
        # use these instead.
        base_model = kc_model
    return kc_model, base_model


# Add the standard metadata_cache decorator to this endpoint to align
# with other public endpoints
@method_decorator(metadata_cache, name="dispatch")
class ImportMetadataViewset(GenericViewSet):
    # Add an explicit allow any permission class to override the Studio default
    permission_classes = (AllowAny,)
    default_content_schema = CONTENT_SCHEMA_VERSION
    min_content_schema = MIN_CONTENT_SCHEMA_VERSION

    def _error_message(self, low):
        error = "Schema version is too "
        if low:
            error += "low"
        else:
            error += "high"
        if self.default_content_schema == self.min_content_schema:
            error += ", exports only suported for version {}".format(
                self.default_content_schema
            )
        else:
            error += ", exports only suported for versions {} to {}".format(
                self.min_content_schema, self.default_content_schema
            )
        return error

    def retrieve(self, request, pk=None):  # noqa: C901
        """
        An endpoint to retrieve all content metadata required for importing a content node
        all of its ancestors, and any relevant needed metadata.

        :param request: request object
        :param pk: id parent node
        :return: an object with keys for each content metadata table and a schema_version key
        """

        try:
            UUID(pk)
        except ValueError:
            return Response(
                {"error": "Invalid UUID format."},
                status=status.HTTP_400_BAD_REQUEST
            )

        content_schema = request.query_params.get(
            "schema_version", self.default_content_schema
        )

        try:
            if int(content_schema) > int(self.default_content_schema):
                return HttpResponseBadRequest(self._error_message(False))
            if int(content_schema) < int(self.min_content_schema):
                return HttpResponseBadRequest(self._error_message(True))
            # Remove reference to SQLAlchemy schema bases
        except ValueError:
            return HttpResponseBadRequest(
                "Schema version is not parseable by this version of Kolibri"
            )
        except AttributeError:
            return HttpResponseBadRequest(
                "Schema version is not known by this version of Kolibri"
            )

        # Get the model for the target node here - we do this so that we trigger a 404 immediately if the node
        # does not exist.
        node = get_object_or_404(models.ContentNode.objects.all(), pk=pk)

        nodes = node.get_ancestors(include_self=True)

        data = {}

        files = models.File.objects.filter(contentnode__in=nodes)
        through_tags = models.ContentNode.tags.through.objects.filter(
            contentnode__in=nodes
        )
        assessmentmetadata = models.AssessmentMetaData.objects.filter(
            contentnode__in=nodes
        )
        localfiles = models.LocalFile.objects.filter(files__in=files).distinct()
        tags = models.ContentTag.objects.filter(
            id__in=through_tags.values_list("contenttag_id", flat=True)
        ).distinct()
        languages = models.Language.objects.filter(
            Q(id__in=files.values_list("lang_id", flat=True))
            | Q(id__in=nodes.values_list("lang_id", flat=True))
        )
        node_ids = nodes.values_list("id", flat=True)
        prerequisites = models.ContentNode.has_prerequisite.through.objects.filter(
            from_contentnode_id__in=node_ids, to_contentnode_id__in=node_ids
        )
        related = models.ContentNode.related.through.objects.filter(
            from_contentnode_id__in=node_ids, to_contentnode_id__in=node_ids
        )
        channel_metadata = models.ChannelMetadata.objects.filter(id=node.channel_id)

        cursor = connection.cursor()

        for qs in [
            nodes,
            files,
            through_tags,
            assessmentmetadata,
            localfiles,
            tags,
            languages,
            prerequisites,
            related,
            channel_metadata,
        ]:
            # First get the kolibri_content model and base model to which this is equivalent
            kc_model, base_model = _get_kc_and_base_models(qs.model)
            # Map the table name from the kolibri_public table name to the equivalent Kolibri table name
            table_name = kc_model._meta.db_table
            # Tweak our introspection here to rely on Django model meta instead of SQLAlchemy
            # Read valid field names from the combination of the base model, and the mptt tree fields
            # of the kc_model - because the base model is abstract, it does not get the mptt fields applied
            # to its meta fields attribute, so we need to read the actual fields from the kc_model, but filter
            # them only to names valid for the base model.
            field_names = {field.column for field in base_model._meta.fields}
            if hasattr(base_model, "_mptt_meta"):
                field_names.add(base_model._mptt_meta.parent_attr)
                field_names.add(base_model._mptt_meta.tree_id_attr)
                field_names.add(base_model._mptt_meta.left_attr)
                field_names.add(base_model._mptt_meta.right_attr)
                field_names.add(base_model._mptt_meta.level_attr)
            raw_fields = [field.column for field in kc_model._meta.fields if field.column in field_names]
            if qs.model is models.Language:
                raw_fields = [rf for rf in raw_fields if rf != "lang_name"] + ["native_name"]
            qs = qs.values(*raw_fields)
            # Avoid using the Django queryset directly, as it will coerce the database values
            # via its field 'from_db_value' transformers, whereas import metadata is read
            # directly from the database.
            # One example is for JSON field data that is stored as a string in the database,
            # we want to avoid that being coerced to Python objects.
            cursor.execute(*qs.query.sql_with_params())
            data[table_name] = [
                # Coerce any UUIDs to their hex representation, as Postgres raw values will be UUIDs
                dict(zip(raw_fields, (value.hex if isinstance(value, UUID) else value for value in row))) for row in cursor
            ]
            if qs.model is models.Language:
                for lang in data[table_name]:
                    lang["lang_name"] = lang["native_name"]
                    del lang["native_name"]

        data["schema_version"] = content_schema

        return Response(data)
