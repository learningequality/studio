"""
This is a copy with modifications of the file:
https://github.com/learningequality/kolibri/blob/deeec22db9f9e607714bb8ea2c8b3b377f02a5ab/kolibri/core/content/contentschema/columns/__init__.py
"""
import importlib

from kolibri_content.constants.schema_versions import EXPORT_SCHEMA_VERSIONS


def for_version(version):
    """
    A content schema version's table names mapped to its column names, in
    declaration order.
    """
    if version not in EXPORT_SCHEMA_VERSIONS:
        raise ValueError(f"Unknown content schema version {version}")
    return importlib.import_module(".content_columns_" + version, __name__).COLUMNS
