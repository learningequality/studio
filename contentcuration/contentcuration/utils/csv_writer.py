import csv
import io
import os
import re
import sys

from django.conf import settings
from django.contrib.sites.models import Site
from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models.sql.constants import LOUTER
from django.utils.translation import gettext as _
from le_utils.constants import content_kinds

from contentcuration.db.models.query import With
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import generate_storage_url

if not os.path.exists(settings.CSV_ROOT):
    os.makedirs(settings.CSV_ROOT)


# Formatting helpers


def _format_size(num, suffix="B"):
    """ Format sizes """
    for unit in ["", "K", "M", "G", "T", "P", "E", "Z"]:
        if abs(num) < 1024.0:
            return "%3.1f%s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f%s%s" % (num, "Yi", suffix)


def generate_user_csv_filename(user):
    directory = os.path.join(settings.CSV_ROOT, "users")
    if not os.path.exists(directory):
        os.makedirs(directory)
    email = re.sub(r"([^\s\w]|_)+", "", user.email.split(".")[0])
    return os.path.join(
        directory,
        "{}{}- {} {} Data.csv".format(email, user.id, user.first_name, user.last_name),
    )


def _write_user_row(file, writer, domain):
    filename = "{}.{}".format(file["checksum"], file["file_extension"])
    writer.writerow(
        [
            file["channel_name"] or _("No Channel"),
            file["node_title"] or _("No resource"),
            next(
                (k[1] for k in content_kinds.choices if k[0] == file["node_kind_id"]),
                "",
            ),
            file["original_filename"],
            _format_size(file["file_size"] or 0),
            generate_storage_url(filename),
            file["node_description"],
            file["node_author"],
            file["file_language"] or file["node_language"],
            file["node_license_name"],
            file["node_license_description"],
            file["node_copyright_holder"],
        ]
    )


def write_user_csv(user, path=None):
    csv_path = path or generate_user_csv_filename(user)
    mode = "wb"
    encoding = None
    # On Python 3,
    if sys.version_info.major == 3:
        mode = "w"
        encoding = "utf-8"
    with io.open(csv_path, mode, encoding=encoding) as csvfile:
        writer = csv.writer(csvfile, delimiter=",", quoting=csv.QUOTE_MINIMAL)

        writer.writerow(
            [
                _("Channel"),
                _("Title"),
                _("Kind"),
                _("Filename"),
                _("File Size"),
                _("URL"),
                _("Description"),
                _("Author"),
                _("Language"),
                _("License"),
                _("License Description"),
                _("Copyright Holder"),
            ]
        )

        domain = Site.objects.get(pk=1).domain

        # Build CTEs so we first reduce to this user's files, then resolve only
        # needed content node and channel fields.
        user_files_cte = With(
            user.files.values(
                "id",
                "contentnode_id",
                "original_filename",
                "file_size",
                "checksum",
                file_extension=F("file_format__extension"),
                file_language=F("language__readable_name"),
            ),
            name="user_files",
        )

        content_nodes_cte = With(
            user_files_cte.join(
                ContentNode.objects.all(),
                id=user_files_cte.col.contentnode_id,
            )
            .values(
                "id",
                "tree_id",
                node_title=F("title"),
                node_kind_id=F("kind_id"),
                node_description=F("description"),
                node_author=F("author"),
                node_language=F("language__readable_name"),
                node_license_name=F("license__license_name"),
                node_license_description=F("license_description"),
                node_copyright_holder=F("copyright_holder"),
            )
            .distinct(),
            name="content_nodes",
        )

        main_channel_names = Channel.objects.filter(
            Exists(
                content_nodes_cte.queryset().filter(
                    tree_id=OuterRef("main_tree__tree_id")
                )
            )
        ).values(
            tree_id=F("main_tree__tree_id"),
            channel_name=F("name"),
        )
        trash_channel_names = Channel.objects.filter(
            Exists(
                content_nodes_cte.queryset().filter(
                    tree_id=OuterRef("trash_tree__tree_id")
                )
            )
        ).values(
            tree_id=F("trash_tree__tree_id"),
            channel_name=F("name"),
        )
        channel_names_cte = With(
            main_channel_names.union(trash_channel_names), name="channel_names"
        )

        user_files = (
            content_nodes_cte.join(
                user_files_cte.queryset(),
                contentnode_id=content_nodes_cte.col.id,
                _join_type=LOUTER,
            )
            .with_cte(user_files_cte)
            .with_cte(content_nodes_cte)
            .with_cte(channel_names_cte)
            .annotate(
                channel_name=Subquery(
                    channel_names_cte.queryset()
                    .filter(tree_id=content_nodes_cte.col.tree_id)
                    .values("channel_name")[:1]
                ),
                node_title=content_nodes_cte.col.node_title,
                node_kind_id=content_nodes_cte.col.node_kind_id,
                node_description=content_nodes_cte.col.node_description,
                node_author=content_nodes_cte.col.node_author,
                node_language=content_nodes_cte.col.node_language,
                node_license_name=content_nodes_cte.col.node_license_name,
                node_license_description=content_nodes_cte.col.node_license_description,
                node_copyright_holder=content_nodes_cte.col.node_copyright_holder,
            )
            .values(
                "channel_name",
                "original_filename",
                "file_size",
                "checksum",
                "file_extension",
                "file_language",
                "node_title",
                "node_kind_id",
                "node_description",
                "node_author",
                "node_language",
                "node_license_name",
                "node_license_description",
                "node_copyright_holder",
            )
        )
        for file in user_files:
            _write_user_row(file, writer, domain)

        for file in user.staged_files.all():
            file_size = _format_size(file.file_size)
            writer.writerow(
                [
                    _("No Channel"),
                    _("No Resource"),
                    "",
                    _("Staged File"),
                    file_size,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
            )

    return csv_path
