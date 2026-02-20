import json
import logging as logmodule
import time

from django.core.management.base import BaseCommand
from le_utils.constants import content_kinds
from le_utils.constants import exercises

from contentcuration.models import ContentNode
from contentcuration.utils.nodes import migrate_extra_fields

logging = logmodule.getLogger("command")

CHUNKSIZE = 5000


def _needs_m_n_fix(extra_fields):
    """
    Check if already-migrated extra_fields have non-null m/n
    on a non-m_of_n mastery model.
    """
    try:
        threshold = extra_fields["options"]["completion_criteria"]["threshold"]
    except (KeyError, TypeError):
        return False
    mastery_model = threshold.get("mastery_model")
    if mastery_model is None or mastery_model == exercises.M_OF_N:
        return False
    return threshold.get("m") is not None or threshold.get("n") is not None


def _needs_old_style_migration(extra_fields):
    """
    Check if extra_fields still has old-style top-level mastery_model.
    """
    return isinstance(extra_fields, dict) and "mastery_model" in extra_fields


class Command(BaseCommand):
    help = (
        "Fix exercise extra_fields that were migrated with invalid m/n values "
        "in their completion criteria threshold. Non-m_of_n mastery models "
        "require m and n to be null, but old data may have had non-null values "
        "that were carried over during migration. Also migrates any remaining "
        "old-style extra_fields to the new format."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be changed without modifying the database.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        start = time.time()

        # Single pass over all exercises, filtering in Python to avoid
        # expensive nested JSON field queries in the database.
        queryset = ContentNode.objects.filter(kind_id=content_kinds.EXERCISE).only(
            "id", "extra_fields", "complete", "kind_id"
        )

        migrated_fixed = 0
        old_style_fixed = 0

        for node in queryset.iterator(chunk_size=CHUNKSIZE):
            result = self._process_node(node, dry_run)
            if result == "old_style":
                old_style_fixed += 1
            elif result == "m_n_fix":
                migrated_fixed += 1

        logging.info(
            "Done in {:.1f}s. Fixed {} migrated exercises, "
            "migrated {} old-style exercises.{}".format(
                time.time() - start,
                migrated_fixed,
                old_style_fixed,
                " (dry run)" if dry_run else "",
            )
        )

    def _process_node(self, node, dry_run):
        ef = node.extra_fields
        if isinstance(ef, str):
            try:
                ef = json.loads(ef)
            except (json.JSONDecodeError, ValueError):
                return None
            node.extra_fields = ef
        if not isinstance(ef, dict):
            return None

        if _needs_old_style_migration(ef):
            if not dry_run:
                node.extra_fields = migrate_extra_fields(ef)
                node.mark_complete()
                node.save(update_fields=["extra_fields", "complete"])
            return "old_style"
        elif _needs_m_n_fix(ef):
            if not dry_run:
                threshold = ef["options"]["completion_criteria"]["threshold"]
                threshold["m"] = None
                threshold["n"] = None
                node.mark_complete()
                node.save(update_fields=["extra_fields", "complete"])
            return "m_n_fix"
        return None
