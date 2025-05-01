import json
import logging
from collections import namedtuple

from distutils.version import LooseVersion
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied
from django.core.exceptions import SuspiciousOperation
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import HttpResponseBadRequest
from django.http import HttpResponseForbidden
from django.http import HttpResponseNotFound
from django.http import HttpResponseServerError
from django.http import JsonResponse
from le_utils.constants import content_kinds
from le_utils.constants import roles
from le_utils.constants.labels.accessibility_categories import ACCESSIBILITYCATEGORIESLIST
from le_utils.constants.labels.learning_activities import LEARNINGACTIVITIESLIST
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.resource_type import RESOURCETYPELIST
from le_utils.constants.labels.subjects import SUBJECTSLIST
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from sentry_sdk import capture_exception

from contentcuration import ricecooker_versions as rc
from contentcuration.api import write_file_to_storage
from contentcuration.constants import completion_criteria
from contentcuration.decorators import delay_user_storage_calculation
from contentcuration.models import AssessmentItem
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import License
from contentcuration.models import SlideshowSlide
from contentcuration.models import StagedFile
from contentcuration.serializers import GetTreeDataSerializer
from contentcuration.tasks import apply_channel_changes_task
from contentcuration.tasks import generatenodediff_task
from contentcuration.utils.files import get_file_diff
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.utils.nodes import map_files_to_assessment_item
from contentcuration.utils.nodes import map_files_to_node
from contentcuration.utils.nodes import map_files_to_slideshow_slide_item
from contentcuration.utils.sentry import report_exception
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.utils import generate_publish_event
from contentcuration.viewsets.sync.utils import generate_update_event


VersionStatus = namedtuple("VersionStatus", ["version", "status", "message"])
VERSION_OK = VersionStatus(
    version=rc.VERSION_OK, status=0, message=rc.VERSION_OK_MESSAGE
)
VERSION_SOFT_WARNING = VersionStatus(
    version=rc.VERSION_SOFT_WARNING, status=1, message=rc.VERSION_SOFT_WARNING_MESSAGE
)
VERSION_HARD_WARNING = VersionStatus(
    version=rc.VERSION_HARD_WARNING, status=2, message=rc.VERSION_HARD_WARNING_MESSAGE
)
VERSION_ERROR = VersionStatus(
    version=rc.VERSION_ERROR, status=3, message=rc.VERSION_ERROR_MESSAGE
)


class NodeValidationError(ValidationError):
    pass


def handle_server_error(e, request):
    capture_exception(e, tags={"url": request.path})


@api_view(["POST", "GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def authenticate_user_internal(request):
    """ Verify user is valid """
    logging.debug("Logging in user")
    return Response(
        {
            "success": True,
            "user_id": request.user.id,
            "username": str(request.user),
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "is_admin": request.user.is_admin,
        }
    )


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def check_version(request):
    """ Get version of Ricecooker with which CC is compatible """
    try:
        logging.debug("Entering the check_version endpoint")
        version = json.loads(request.body)["version"]
        status = None

        if LooseVersion(version) >= LooseVersion(VERSION_OK[0]):
            status = VERSION_OK
        elif LooseVersion(version) >= LooseVersion(VERSION_SOFT_WARNING[0]):
            status = VERSION_SOFT_WARNING
        elif LooseVersion(version) >= LooseVersion(VERSION_HARD_WARNING[0]):
            status = VERSION_HARD_WARNING
        else:
            status = VERSION_ERROR

        return JsonResponse(
            {
                "success": True,
                "status": status[1],
                "message": status[2].format(version, VERSION_OK[0]),
            }
        )
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def file_diff(request):
    """ Determine which files don't exist on server """
    try:
        logging.debug("Entering the file_diff endpoint")
        data = json.loads(request.body)

        # Might want to use this once assumption that file exists is true (save on performance)
        # in_db_list = File.objects.annotate(filename=Concat('checksum', Value('.'),  'file_format'))
        #                          .filter(filename__in=data).values_list('filename', flat=True)
        # for f in list(set(data) - set(in_db_list)):
        to_return = get_file_diff(data)

        return Response(to_return)
    except Exception as e:
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication,))
@permission_classes((IsAuthenticated,))
def api_file_upload(request):
    """ Upload a file to the storage system """
    try:
        fobj = request.FILES["file"]
        checksum, ext = fobj._name.split(".")
        try:
            request.user.check_staged_space(fobj.size, checksum)
        except Exception as e:
            return HttpResponseForbidden(str(e))

        try:
            write_file_to_storage(fobj, check_valid=True)
        except SuspiciousOperation as e:
            return HttpResponseBadRequest(str(e))

        StagedFile.objects.get_or_create(
            checksum=checksum, file_size=fobj.size, uploaded_by=request.user
        )

        return Response({"success": True})
    except KeyError:
        return HttpResponseBadRequest("Invalid file upload request")
    except Exception as e:
        handle_server_error(e, request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_create_channel_endpoint(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        channel_data = data["channel_data"]

        obj = create_channel(channel_data, request.user)

        return Response({
            "success": True,
            "root": obj.chef_tree.pk,
            "channel_id": obj.pk,
        })
    except KeyError:
        return HttpResponseBadRequest("Required attribute missing from data: {}".format(data))
    except Exception as e:
        handle_server_error(e, request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_commit_channel(request):
    """
    Commit the channel chef_tree to staging tree to the main tree.
    This view backs the endpoint `/api/internal/finish_channel` called by ricecooker.
    """
    data = json.loads(request.body)
    try:
        channel_id = data["channel_id"]

        obj = Channel.get_editable(request.user, channel_id)

        # set original_channel_id and source_channel_id to self since chef tree
        obj.chef_tree.get_descendants(include_self=True).update(
            original_channel_id=channel_id, source_channel_id=channel_id
        )

        # replace staging_tree with chef_tree
        old_staging = obj.staging_tree
        obj.staging_tree = obj.chef_tree
        obj.chef_tree = None
        obj.save()

        # Prepare change event indicating a new staging_tree is available
        event = generate_update_event(
            channel_id,
            CHANNEL,
            {"root_id": obj.main_tree.id, "staging_root_id": obj.staging_tree.id},
            channel_id=channel_id,
        )
        # Send event (new staging tree or new main tree) for the channel
        # mark is as unpublishable, as by itself a new staging tree is not a publishable change
        Change.create_change(event, created_by_id=request.user.id, unpublishable=True)

        # Mark old staging tree for garbage collection
        if old_staging and old_staging != obj.main_tree:
            # IMPORTANT: Do not remove this block, MPTT updating the deleted chefs block could hang the server
            with ContentNode.objects.disable_mptt_updates():
                garbage_node = get_deleted_chefs_root()
                old_staging.parent = garbage_node
                old_staging.title = "Old staging tree for channel {}".format(obj.pk)
                old_staging.save()

        async_result = generatenodediff_task.enqueue(request.user, updated_id=obj.staging_tree.id, original_id=obj.main_tree.id)

        # Send response back to the content integration script
        return Response({
            "success": True,
            "new_channel": obj.pk,
            "diff_task_id": async_result.task_id,
        })
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    except KeyError:
        return HttpResponseBadRequest("Required attribute missing from data: {}".format(data))
    except Exception as e:
        handle_server_error(e, request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_add_nodes_to_tree(request):
    """
    Add the nodes from the `content_data` (list) as children to the parent node
    whose pk is specified in `root_id`. The list `content_data` conatins json
    dicts obtained from the to_dict serialization of the ricecooker node class.

    NOTE: It's important that calls made to this API proceed through the tree
    in a linear fashion, from first to last topic, recursively iterating through
    children. This ensures that MPTT updates take the least amount of time
    necessary, and removes the need to delay or disable MPTT updates.

    Response is of the form
    ```
        { "success": bool,
          "root_ids": [
                  "<node1_node_id>": "node1_pk",
                  "<node2_node_id>": "node2_pk",
                  ...
          ]}
    ```
    """
    data = json.loads(request.body)
    try:
        content_data = data['content_data']
        parent_id = data['root_id']
        ContentNode.filter_edit_queryset(ContentNode.objects.all(), request.user).get(id=parent_id)
        return Response({
            "success": True,
            "root_ids": convert_data_to_nodes(request.user, content_data, parent_id)
        })
    except ContentNode.DoesNotExist:
        return HttpResponseNotFound("No content matching: {}".format(parent_id))
    except ValidationError as e:
        return HttpResponseBadRequest(content=str(e))
    except KeyError:
        return HttpResponseBadRequest("Required attribute missing from data: {}".format(data))
    except NodeValidationError as e:
        return HttpResponseBadRequest(str(e))
    except Exception as e:
        handle_server_error(e, request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def api_publish_channel(request):
    logging.debug("Entering the publish_channel endpoint")
    data = json.loads(request.body)

    try:
        channel_id = data["channel_id"]
        # Ensure that the user has permission to edit this channel.
        Channel.get_editable(request.user, channel_id)

        event = generate_publish_event(channel_id, version_notes=data.get('version_notes'))

        Change.create_change(event, created_by_id=request.user.pk)

        apply_channel_changes_task.fetch_or_enqueue(request.user, channel_id=channel_id)

        return Response({
            "success": True,
            "channel": channel_id,
        })
    except (KeyError, Channel.DoesNotExist):
        return HttpResponseNotFound("No channel matching: {}".format(data))
    except Exception as e:
        handle_server_error(e, request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def check_user_is_editor(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        channel_id = data["channel_id"]
        try:
            Channel.get_editable(request.user, channel_id)
            return Response({"success": True})
        except Channel.DoesNotExist:
            return HttpResponseNotFound("Channel not found {}".format(channel_id))

    except KeyError:
        raise HttpResponseBadRequest("Missing attribute from data: {}".format(data))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_tree_data(request):
    """
    Get the tree data for the `tree` tree of channel `channel_id`.
    WARNING: this endpoint timesouts for large channels.
    Returns { success: true, tree:[ nodes in channel_id ] }
    """
    serializer = GetTreeDataSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        channel_id = serializer.validated_data['channel_id']
        channel = Channel.get_editable(request.user, channel_id)
        tree_name = "{}_tree".format(serializer.validated_data['tree'])
        tree_root = getattr(channel, tree_name, None)
        if tree_root is None:
            raise ValueError("Invalid tree name")
        tree_data = tree_root.get_tree_data()
        children_data = tree_data.get("children", [])
        return Response({"success": True, "tree": children_data})
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    except ValueError:
        return HttpResponseNotFound("No tree name matching: {}".format(tree_name))
    except Exception as e:
        handle_server_error(e, request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_node_tree_data(request):
    """
    Get one level of children data for for the node `node_id` of
    the `tree` tree associated with channel `data['channel_id']`.
    Returns { success: true, tree:[ children of node_id ] }
    """
    serializer = GetTreeDataSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        channel_id = serializer.validated_data['channel_id']
        channel = Channel.get_editable(request.user, channel_id)
        tree_name = "{}_tree".format(serializer.validated_data['tree'])
        tree_root = getattr(channel, tree_name, None)
        if "node_id" in serializer.validated_data:
            node = (
                tree_root.get_descendants()
                .filter(node_id=serializer.validated_data["node_id"])
                .first()
            )
        else:
            node = tree_root
        tree_data = node.get_tree_data(levels=1)
        children_data = tree_data.get("children", [])
        response_data = {
            "success": True,
            "tree": children_data,
            "staged": channel.staging_tree is not None,
        }
        return Response(response_data)
    except Channel.DoesNotExist:
        return HttpResponseNotFound("No channel matching: {}".format(channel_id))
    except Exception as e:
        handle_server_error(e, request)
        return HttpResponseServerError(content=str(e), reason=str(e))


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def get_channel_status_bulk(request):
    """ Create the channel node """
    data = json.loads(request.body)
    try:
        channel_ids = data['channel_ids']
        permissioned_ids = set(Channel.filter_edit_queryset(Channel.objects.all(), request.user).filter(id__in=channel_ids).values_list("id", flat=True))
        if permissioned_ids != set(channel_ids):
            raise PermissionDenied()
        statuses = {cid: get_status(cid) for cid in data['channel_ids']}

        return Response({"success": True, "statuses": statuses})
    except (Channel.DoesNotExist, PermissionDenied):
        return HttpResponseNotFound(
            "No complete set of channels matching: {}".format(",".join(channel_ids))
        )
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))
    except Exception as e:
        handle_server_error(e, request)
        return HttpResponseServerError(content=str(e), reason=str(e))


def get_status(channel_id):
    obj = Channel.objects.filter(pk=channel_id).first()
    if not obj:
        return "active"
    if obj.deleted:
        return "deleted"
    if obj.staging_tree:
        return "staged"
    if obj.main_tree.get_descendants().filter(changed=True).exists():
        return "unpublished"
    return "active"


# CHANNEL CREATE FUNCTIONS
def create_channel(channel_data, user):
    """ Set up channel """
    # Set up initial channel
    channel, isNew = Channel.objects.get_or_create(id=channel_data["id"], actor_id=user.id)

    # Add user as editor if channel is new
    if isNew:
        channel.editors.add(user)
    try:
        # Check if user is an editor
        channel = Channel.get_editable(user, channel.id)
    except Channel.DoesNotExist:
        raise SuspiciousOperation("User is not authorized to edit this channel")

    extra_fields = channel_data.get('extra_fields') or {}
    if isinstance(extra_fields, str):
        extra_fields = json.loads(extra_fields)
    extra_fields.update({'ricecooker_version': channel.ricecooker_version})

    channel.name = channel_data['name']
    channel.description = channel_data['description']
    channel.thumbnail = channel_data['thumbnail']
    channel.deleted = False
    channel.source_id = channel_data.get("source_id")
    channel.source_domain = channel_data.get("source_domain")
    channel.source_url = (
        channel_data.get("source_domain") if isNew else channel.source_url
    )
    channel.ricecooker_version = channel_data.get("ricecooker_version")
    channel.language_id = channel_data.get("language")

    # older versions of ricecooker won't be sending this field.
    if "tagline" in channel_data:
        channel.tagline = channel_data["tagline"]

    old_chef_tree = channel.chef_tree
    is_published = channel.main_tree is not None and channel.main_tree.published
    # Set up initial staging tree
    channel.chef_tree = ContentNode.objects.create(
        title=channel.name,
        kind_id=content_kinds.TOPIC,
        published=is_published,
        content_id=channel.id,
        node_id=channel.id,
        source_id=channel.source_id,
        source_domain=channel.source_domain,
        extra_fields=extra_fields,
        complete=True,
    )
    files = channel_data.get("files")
    if files:
        map_files_to_node(user, channel.chef_tree, files)
    channel.chef_tree.save()
    # If the channel was previously deleted, this save will undelete it
    # so will require the actor_id to be set
    channel.save(actor_id=user.id)

    # Delete chef tree if it already exists
    if old_chef_tree and old_chef_tree != channel.staging_tree:
        # IMPORTANT: Do not remove this block, MPTT updating the deleted chefs block could hang the server
        with ContentNode.objects.disable_mptt_updates():
            garbage_node = get_deleted_chefs_root()
            old_chef_tree.parent = garbage_node
            old_chef_tree.title = "Old chef tree for channel {}".format(channel.pk)
            old_chef_tree.save()

    return channel  # Return new channel


class IncompleteNodeError(Exception):
    """
    Used to track incomplete nodes from ricecooker. We don't raise this error,
    just feed it to Sentry for reporting.
    """

    def __init__(self, node, errors):
        self.message = (
            "Node {} had the following errors: {}".format(node, ",".join(errors))
        )

        super(IncompleteNodeError, self).__init__(self.message)


def add_tags(node, node_data):
    tags = []
    channel = node.get_channel()
    if "tags" in node_data:
        tag_data = node_data["tags"]
        if tag_data is not None:
            for tag in tag_data:
                if len(tag) > 30:
                    raise ValidationError("tag is greater than 30 characters")
                else:
                    tags.append(
                        ContentTag.objects.get_or_create(tag_name=tag, channel=channel)[0]
                    )

    if len(tags) > 0:
        node.tags.add(*tags)


def validate_metadata_labels(node_data):
    metadata_labels = {}

    for label, valid_values in METADATA.items():
        if label in node_data:
            if type(node_data[label]) is not list:
                raise NodeValidationError("{} must pass a list of values".format(label))
            metadata_labels[label] = {}
            for value in node_data[label]:
                if value not in valid_values:
                    raise NodeValidationError("{} is not a valid value for {}".format(value, label))
                metadata_labels[label][value] = True

    return metadata_labels


def handle_remote_node(user, node_data, parent_node):
    if node_data["source_channel_id"] is None:
        raise NodeValidationError("source_channel_id was None")
    source_channel_id = node_data["source_channel_id"]

    source_node_id = node_data.get("source_node_id")

    source_content_id = node_data.get("source_content_id")

    if not source_node_id and not source_content_id:
        raise NodeValidationError("Both source_node_id and source_content_id are None")

    try:
        channel = Channel.filter_view_queryset(Channel.objects.all(), user).get(id=source_channel_id)
    except Channel.DoesNotExist:
        raise NodeValidationError("source_channel_id does not exist")

    contentnode = None

    channel_resource_nodes = channel.main_tree.get_descendants().exclude(kind=content_kinds.TOPIC)

    if source_node_id:
        try:
            contentnode = channel_resource_nodes.get(node_id=source_node_id)
        except ContentNode.DoesNotExist:
            pass

    if contentnode is None and source_content_id:
        contentnode = channel_resource_nodes.filter(content_id=source_content_id).first()

    if contentnode is None:
        raise NodeValidationError(
            "Unable to find node with node_id {} and/or content_id {} from channel {}".format(
                source_node_id, source_content_id, source_channel_id
            )
        )

    metadata_labels = validate_metadata_labels(node_data)

    # Validate any metadata labels then overwrite the source data so that we are
    # setting validated and appropriate mapped metadata.
    node_data.update(metadata_labels)

    can_edit_source_channel = ContentNode.filter_edit_queryset(
        ContentNode.filter_by_pk(pk=contentnode.id), user=user
    ).exists()

    return contentnode.copy_to(target=parent_node, mods=node_data, can_edit_source_channel=can_edit_source_channel)


@delay_user_storage_calculation
def convert_data_to_nodes(user, content_data, parent_node):  # noqa: C901
    """ Parse dict and create nodes accordingly """
    try:
        root_mapping = {}
        parent_node = ContentNode.objects.get(pk=parent_node)
        if parent_node.kind_id != content_kinds.TOPIC:
            raise NodeValidationError("Parent node must be a topic/folder | actual={}".format(parent_node.kind_id))

        sort_order = parent_node.children.count() + 1
        existing_node_ids = ContentNode.objects.filter(
            parent_id=parent_node.pk
        ).values_list("node_id", flat=True)
        with transaction.atomic():
            for node_data in content_data:
                # Check if node id is already in the tree to avoid duplicates
                if node_data["node_id"] not in existing_node_ids:
                    if "source_channel_id" in node_data:
                        new_node = handle_remote_node(user, node_data, parent_node)

                        map_files_to_node(user, new_node, node_data.get("files", []))

                        add_tags(new_node, node_data)

                    else:
                        # Create the node
                        new_node = create_node(node_data, parent_node, sort_order)

                        # Create files associated with node
                        map_files_to_node(user, new_node, node_data["files"])

                        # Create questions associated exercise nodes
                        create_exercises(user, new_node, node_data["questions"])
                        sort_order += 1

                        # Create Slideshow slides (if slideshow kind)
                        if node_data["kind"] == "slideshow":
                            extra_fields_unicode = node_data["extra_fields"]

                            # Extra Fields comes as type<unicode> - convert it to a dict and get slideshow_data
                            extra_fields_json = extra_fields_unicode.encode(
                                "ascii", "ignore"
                            )
                            extra_fields = json.loads(extra_fields_json)

                            slides = create_slides(
                                user, new_node, extra_fields.get("slideshow_data")
                            )
                            map_files_to_slideshow_slide_item(
                                user, new_node, slides, node_data["files"]
                            )

                    # Wait until after files have been set on the node to check for node completeness
                    # as some node kinds are counted as incomplete if they lack a default file.
                    completion_errors = new_node.mark_complete()

                    if completion_errors:
                        try:
                            # we need to raise it to get Python to fill out the stack trace.
                            raise IncompleteNodeError(new_node, completion_errors)
                        except IncompleteNodeError as e:
                            report_exception(e)

                    # Track mapping between newly created node and node id
                    root_mapping.update({node_data["node_id"]: new_node.pk})
            return root_mapping

    except KeyError as e:
        raise ObjectDoesNotExist("Error creating node: {0}".format(e))


METADATA = {
    "grade_levels": set(LEVELSLIST),
    "resource_types": set(RESOURCETYPELIST),
    "learning_activities": set(LEARNINGACTIVITIESLIST),
    "accessibility_labels": set(ACCESSIBILITYCATEGORIESLIST),
    "categories": set(SUBJECTSLIST),
    "learner_needs": set(NEEDSLIST),
}


def create_node(node_data, parent_node, sort_order):  # noqa: C901
    """ Generate node based on node dict """
    # Make sure license is valid
    license = None
    license_name = node_data["license"]
    if license_name is not None:
        try:
            license = License.objects.get(license_name__iexact=license_name)
        except ObjectDoesNotExist:
            raise ObjectDoesNotExist("Invalid license found")

    extra_fields = node_data["extra_fields"] or {}
    if isinstance(extra_fields, str):
        extra_fields = json.loads(extra_fields)

    # validate completion criteria
    if "options" in extra_fields and "completion_criteria" in extra_fields["options"]:
        try:
            completion_criteria.validate(extra_fields["options"]["completion_criteria"], kind=node_data['kind'])
        except completion_criteria.ValidationError:
            raise NodeValidationError("Node {} has invalid completion criteria".format(node_data["node_id"]))

    # Validate title and license fields
    title = node_data.get('title', "")
    license_description = node_data.get('license_description', "")
    copyright_holder = node_data.get('copyright_holder', "")

    metadata_labels = validate_metadata_labels(node_data)

    node = ContentNode.objects.create(
        title=title,
        tree_id=parent_node.tree_id,
        kind_id=node_data["kind"],
        node_id=node_data["node_id"],
        content_id=node_data["content_id"],
        description=node_data["description"],
        author=node_data["author"],
        aggregator=node_data.get("aggregator") or "",
        provider=node_data.get("provider") or "",
        license=license,
        license_description=license_description,
        copyright_holder=copyright_holder,
        parent=parent_node,
        extra_fields=extra_fields,
        sort_order=sort_order,
        source_id=node_data.get("source_id"),
        source_domain=node_data.get("source_domain"),
        language_id=node_data.get("language"),
        freeze_authoring_data=True,
        role_visibility=node_data.get('role') or roles.LEARNER,
        # Assume it is complete to start with, we will do validation
        # later when we have all data available to determine if it is
        # complete or not.
        complete=True,
        suggested_duration=node_data.get("suggested_duration"),
        **metadata_labels
    )

    add_tags(node, node_data)

    return node


def create_exercises(user, node, data):
    """ Generate exercise from data """
    # First check that all assessment_ids are unique within the node
    assessment_ids = [question.get("assessment_id") for question in data]
    if len(assessment_ids) != len(set(assessment_ids)):
        raise NodeValidationError("Duplicate assessment_ids found in node {}".format(node.node_id))

    with transaction.atomic():
        order = 0

        for question in data:
            question_obj = AssessmentItem(
                type=question.get("type"),
                question=question.get("question"),
                hints=question.get("hints"),
                answers=question.get("answers"),
                order=order,
                contentnode=node,
                assessment_id=question.get("assessment_id"),
                raw_data=question.get("raw_data"),
                source_url=question.get("source_url"),
                randomize=question.get("randomize") or False,
            )
            order += 1
            question_obj.save()
            map_files_to_assessment_item(user, question_obj, question["files"])


def create_slides(user, node, slideshow_data):
    """ Generate SlideshowSlides from data """
    """ Returns a collection of SlideshowSlide objects """

    slides = []

    with transaction.atomic():
        for slide in slideshow_data:
            slide_obj = SlideshowSlide(
                contentnode=node,
                sort_order=slide.get("sort_order"),
                metadata={
                    "caption": slide.get("caption"),
                    "descriptive_text": slide.get("descriptive_text"),
                    "checksum": slide.get("checksum"),
                    "extension": slide.get("extension"),
                },
            )
            slide_obj.save()
            slides.append(slide_obj)

    return slides
