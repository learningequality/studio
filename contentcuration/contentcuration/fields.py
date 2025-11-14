"""
Transition fields for UUID migration from CHAR(32) to native PostgreSQL UUID.

These fields enable a shadow column migration strategy:
1. Django uses existing CHAR(32) columns
2. Shadow UUID columns automatically sync via pre_save hooks
3. After backfill, cutover renames columns atomically
4. Final step removes old CHAR columns

Usage:
    class MyModel(models.Model):
        id = TransitionUUIDPrimaryKey()  # Creates id (CHAR) + id_uuid (UUID)

    class RelatedModel(models.Model):
        mymodel = TransitionUUIDForeignKey(MyModel, on_delete=models.CASCADE)
        # Creates mymodel_id (CHAR FK) + mymodel_id_uuid (UUID shadow)
"""

import uuid
from django.db import models


def hex_to_uuid(hex_string):
    """
    Convert a 32-character hex string to a UUID object.

    Args:
        hex_string: 32-char hex string (no hyphens) or UUID instance

    Returns:
        uuid.UUID instance or None

    Raises:
        ValueError: If hex_string is not 32 characters
    """
    if not hex_string:
        return None
    if isinstance(hex_string, uuid.UUID):
        return hex_string

    # Ensure it's a string
    hex_string = str(hex_string)

    if len(hex_string) != 32:
        raise ValueError(f"Expected 32-char hex string, got {len(hex_string)} chars: {hex_string}")

    return uuid.UUID(hex_string)


def uuid_to_hex(uuid_obj):
    """
    Convert a UUID object to a 32-character hex string.

    Args:
        uuid_obj: uuid.UUID instance or hex string

    Returns:
        32-char hex string (no hyphens) or None
    """
    if not uuid_obj:
        return None

    if isinstance(uuid_obj, uuid.UUID):
        return uuid_obj.hex

    # If it's already a string, validate and return
    uuid_str = str(uuid_obj)
    if len(uuid_str) == 32:
        # Validate it's valid hex
        uuid.UUID(uuid_str)
        return uuid_str

    # Try to parse as UUID and return hex
    return uuid.UUID(uuid_str).hex


class TransitionUUIDPrimaryKey(models.CharField):
    """
    CharField-based primary key that maintains a shadow UUID column.

    Creates two columns:
    - {name}: CHAR(32) primary key (Django uses this)
    - {name}_uuid: UUID shadow column (synced automatically)

    Example:
        class MyModel(models.Model):
            id = TransitionUUIDPrimaryKey()

        # Creates: id (CHAR(32) PK) + id_uuid (UUID)

    Args:
        uuid_shadow_suffix: Suffix for shadow column name (default: '_uuid')
    """

    def __init__(self, *args, **kwargs):
        # Extract custom kwargs before passing to parent
        self.uuid_shadow_suffix = kwargs.pop('uuid_shadow_suffix', '_uuid')

        # Set CharField requirements
        kwargs['max_length'] = 32
        kwargs['primary_key'] = True

        # Don't pass default through CharField __init__
        # We'll handle UUID generation in pre_save
        kwargs.pop('default', None)

        super().__init__(*args, **kwargs)

        # Store shadow field name for later use
        self._shadow_field_name = None

    def contribute_to_class(self, cls, name, **kwargs):
        """Called when field is added to a model class."""
        super().contribute_to_class(cls, name, **kwargs)

        # Add shadow UUID column
        shadow_name = f"{name}{self.uuid_shadow_suffix}"
        shadow_field = models.UUIDField(
            null=True,
            blank=True,
            unique=True,
            editable=False
        )

        cls.add_to_class(shadow_name, shadow_field)
        self._shadow_field_name = shadow_name

    def pre_save(self, model_instance, add):
        """
        Sync shadow UUID column before save.

        - On create: Generate new UUID, set both columns
        - On update: Convert CHAR to UUID, update shadow
        """
        char_value = getattr(model_instance, self.attname)

        if not char_value and add:
            # New instance: generate UUID
            new_uuid = uuid.uuid4()
            char_value = uuid_to_hex(new_uuid)
            setattr(model_instance, self.attname, char_value)
            setattr(model_instance, self._shadow_field_name, new_uuid)
        elif char_value:
            # Existing value: sync shadow
            uuid_value = hex_to_uuid(char_value)
            setattr(model_instance, self._shadow_field_name, uuid_value)

        return char_value

    def deconstruct(self):
        """Support for migrations."""
        name, path, args, kwargs = super().deconstruct()

        # Remove kwargs that CharField adds but we don't want in migrations
        kwargs.pop('max_length', None)
        kwargs.pop('primary_key', None)

        # Add our custom kwargs
        if self.uuid_shadow_suffix != '_uuid':
            kwargs['uuid_shadow_suffix'] = self.uuid_shadow_suffix

        return name, path, args, kwargs


class TransitionUUIDForeignKey(models.ForeignKey):
    """
    ForeignKey that maintains a shadow UUID column for the _id field.

    Creates two columns:
    - {name}_id: CHAR(32) foreign key (Django uses this)
    - {name}_id_uuid: UUID shadow column (no FK constraint)

    Example:
        class RelatedModel(models.Model):
            mymodel = TransitionUUIDForeignKey(MyModel, on_delete=models.CASCADE)

        # Creates: mymodel_id (CHAR(32) FK) + mymodel_id_uuid (UUID)

    Args:
        uuid_shadow_suffix: Suffix for shadow column name (default: '_uuid')
    """

    def __init__(self, to, on_delete, *args, **kwargs):
        # Extract custom kwargs
        self.uuid_shadow_suffix = kwargs.pop('uuid_shadow_suffix', '_uuid')

        super().__init__(to, on_delete, *args, **kwargs)

        # Store shadow field name for later use
        self._shadow_field_name = None

    def contribute_to_class(self, cls, name, **kwargs):
        """Called when field is added to a model class."""
        super().contribute_to_class(cls, name, **kwargs)

        # Shadow is on the _id field, not the FK field itself
        # e.g., if name='mymodel', shadow is 'mymodel_id_uuid'
        shadow_name = f"{name}_id{self.uuid_shadow_suffix}"

        # Shadow is plain UUID field (no FK constraint during transition)
        shadow_field = models.UUIDField(
            null=True,
            blank=True,
            editable=False,
            db_index=True  # Index for future FK constraint
        )

        cls.add_to_class(shadow_name, shadow_field)
        self._shadow_field_name = shadow_name

    def pre_save(self, model_instance, add):
        """
        Sync shadow UUID column before save.

        Converts the CHAR(32) FK value to UUID and stores in shadow.
        """
        # Get the _id value (not the related object)
        char_value = super().pre_save(model_instance, add)

        # Convert to UUID and store in shadow
        if char_value:
            uuid_value = hex_to_uuid(char_value)
            setattr(model_instance, self._shadow_field_name, uuid_value)
        else:
            setattr(model_instance, self._shadow_field_name, None)

        return char_value

    def deconstruct(self):
        """Support for migrations."""
        name, path, args, kwargs = super().deconstruct()

        # Add our custom kwargs
        if self.uuid_shadow_suffix != '_uuid':
            kwargs['uuid_shadow_suffix'] = self.uuid_shadow_suffix

        return name, path, args, kwargs
