"""
Tests for UUID transition fields (shadow column migration strategy).

These tests verify that:
1. Helper functions correctly convert between hex and UUID
2. TransitionUUIDPrimaryKey creates and syncs shadow columns
3. TransitionUUIDForeignKey creates and syncs shadow FK columns
4. Data integrity is maintained during the transition period
"""

import uuid
import pytest
from django.db import models
from django.test import TestCase

from contentcuration.fields import (
    hex_to_uuid,
    uuid_to_hex,
    TransitionUUIDPrimaryKey,
    TransitionUUIDForeignKey,
)


class TestHelperFunctions(TestCase):
    """Test hex_to_uuid and uuid_to_hex conversion functions."""

    def test_hex_to_uuid_valid_hex(self):
        """Convert 32-char hex string to UUID."""
        hex_str = "a" * 32
        result = hex_to_uuid(hex_str)
        self.assertIsInstance(result, uuid.UUID)
        self.assertEqual(result.hex, hex_str)

    def test_hex_to_uuid_from_uuid_object(self):
        """Pass-through UUID objects unchanged."""
        original_uuid = uuid.uuid4()
        result = hex_to_uuid(original_uuid)
        self.assertEqual(result, original_uuid)

    def test_hex_to_uuid_none(self):
        """Return None for None input."""
        self.assertIsNone(hex_to_uuid(None))

    def test_hex_to_uuid_empty_string(self):
        """Return None for empty string."""
        self.assertIsNone(hex_to_uuid(""))

    def test_hex_to_uuid_invalid_length(self):
        """Raise ValueError for non-32-char strings."""
        with self.assertRaises(ValueError) as ctx:
            hex_to_uuid("abc")
        self.assertIn("Expected 32-char hex", str(ctx.exception))

    def test_uuid_to_hex_from_uuid(self):
        """Convert UUID object to hex string."""
        test_uuid = uuid.uuid4()
        result = uuid_to_hex(test_uuid)
        self.assertEqual(result, test_uuid.hex)
        self.assertEqual(len(result), 32)

    def test_uuid_to_hex_from_hex_string(self):
        """Pass-through valid hex strings."""
        hex_str = "a" * 32
        result = uuid_to_hex(hex_str)
        self.assertEqual(result, hex_str)

    def test_uuid_to_hex_none(self):
        """Return None for None input."""
        self.assertIsNone(uuid_to_hex(None))

    def test_uuid_to_hex_empty_string(self):
        """Return None for empty string."""
        self.assertIsNone(uuid_to_hex(""))

    def test_round_trip_conversion(self):
        """Verify hex->UUID->hex preserves value."""
        original_hex = uuid.uuid4().hex
        uuid_obj = hex_to_uuid(original_hex)
        back_to_hex = uuid_to_hex(uuid_obj)
        self.assertEqual(original_hex, back_to_hex)


class TestTransitionUUIDPrimaryKey(TestCase):
    """Test TransitionUUIDPrimaryKey field behavior."""

    def setUp(self):
        """Create test model dynamically."""
        # We can't easily create test models at runtime for Django tests
        # Instead, we'll use the real ChannelSet model once it's migrated
        # For now, we'll test the field's methods directly
        self.field = TransitionUUIDPrimaryKey()

    def test_field_initialization(self):
        """Verify field is configured as CHAR(32) primary key."""
        field = TransitionUUIDPrimaryKey()
        self.assertEqual(field.max_length, 32)
        self.assertTrue(field.primary_key)
        self.assertEqual(field.uuid_shadow_suffix, '_uuid')

    def test_custom_shadow_suffix(self):
        """Allow custom shadow column suffix."""
        field = TransitionUUIDPrimaryKey(uuid_shadow_suffix='_shadow')
        self.assertEqual(field.uuid_shadow_suffix, '_shadow')

    def test_deconstruct(self):
        """Verify field can be deconstructed for migrations."""
        field = TransitionUUIDPrimaryKey()
        name, path, args, kwargs = field.deconstruct()

        # Should not include CharField defaults
        self.assertNotIn('max_length', kwargs)
        self.assertNotIn('primary_key', kwargs)

    def test_deconstruct_custom_suffix(self):
        """Include custom suffix in deconstruction."""
        field = TransitionUUIDPrimaryKey(uuid_shadow_suffix='_custom')
        name, path, args, kwargs = field.deconstruct()
        self.assertEqual(kwargs['uuid_shadow_suffix'], '_custom')


class TestTransitionUUIDForeignKey(TestCase):
    """Test TransitionUUIDForeignKey field behavior."""

    def test_field_initialization(self):
        """Verify field stores shadow suffix."""
        # Need a dummy model reference
        from contentcuration.models import ChannelSet

        field = TransitionUUIDForeignKey(
            ChannelSet,
            on_delete=models.CASCADE
        )
        self.assertEqual(field.uuid_shadow_suffix, '_uuid')

    def test_custom_shadow_suffix(self):
        """Allow custom shadow column suffix."""
        from contentcuration.models import ChannelSet

        field = TransitionUUIDForeignKey(
            ChannelSet,
            on_delete=models.CASCADE,
            uuid_shadow_suffix='_shadow'
        )
        self.assertEqual(field.uuid_shadow_suffix, '_shadow')

    def test_deconstruct(self):
        """Verify field can be deconstructed for migrations."""
        from contentcuration.models import ChannelSet

        field = TransitionUUIDForeignKey(
            ChannelSet,
            on_delete=models.CASCADE
        )
        name, path, args, kwargs = field.deconstruct()

        # Should be able to reconstruct the field
        self.assertIsNotNone(path)

    def test_deconstruct_custom_suffix(self):
        """Include custom suffix in deconstruction."""
        from contentcuration.models import ChannelSet

        field = TransitionUUIDForeignKey(
            ChannelSet,
            on_delete=models.CASCADE,
            uuid_shadow_suffix='_custom'
        )
        name, path, args, kwargs = field.deconstruct()
        self.assertEqual(kwargs['uuid_shadow_suffix'], '_custom')


# Integration tests will be added after ChannelSet migration is complete
# These tests will verify:
# - Shadow columns are created correctly
# - Data syncs properly on save
# - FK relationships work correctly
# - Backfill command works as expected


@pytest.mark.django_db
class TestTransitionFieldIntegration:
    """
    Integration tests for transition fields using actual models.

    NOTE: These tests require the ChannelSet model to be migrated
    to use TransitionUUIDPrimaryKey first.
    """

    @pytest.mark.skip(reason="Requires ChannelSet migration to be applied")
    def test_channelset_shadow_column_created(self):
        """Verify id_uuid shadow column exists after migration."""
        from contentcuration.models import ChannelSet
        from django.db import connection

        # Check that shadow column exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'contentcuration_channelset'
                AND column_name IN ('id', 'id_uuid')
                ORDER BY column_name
            """)
            columns = cursor.fetchall()

        # Should have both id (CHAR) and id_uuid (UUID)
        assert len(columns) == 2
        assert columns[0] == ('id', 'character varying')
        assert columns[1] == ('id_uuid', 'uuid')

    @pytest.mark.skip(reason="Requires ChannelSet migration to be applied")
    def test_channelset_auto_sync_on_create(self):
        """Verify shadow column syncs automatically on create."""
        from contentcuration.models import ChannelSet

        # Create new ChannelSet
        channelset = ChannelSet.objects.create(name="Test Set")

        # Both columns should be set
        assert channelset.id is not None
        assert channelset.id_uuid is not None

        # Values should match
        assert channelset.id == channelset.id_uuid.hex

    @pytest.mark.skip(reason="Requires ChannelSet migration to be applied")
    def test_channelset_auto_sync_on_update(self):
        """Verify shadow column syncs on update."""
        from contentcuration.models import ChannelSet

        # Create and save
        channelset = ChannelSet.objects.create(name="Test Set")
        original_id = channelset.id
        original_uuid = channelset.id_uuid

        # Update name (not ID)
        channelset.name = "Updated Name"
        channelset.save()

        # IDs should remain unchanged
        assert channelset.id == original_id
        assert channelset.id_uuid == original_uuid

    @pytest.mark.skip(reason="Requires through model migration to be applied")
    def test_m2m_through_shadow_column(self):
        """Verify M2M through model has shadow FK column."""
        from contentcuration.models import User
        from django.db import connection

        # Check through table structure
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'contentcuration_channelset_editors'
                AND column_name LIKE 'channelset_id%'
                ORDER BY column_name
            """)
            columns = cursor.fetchall()

        # Should have channelset_id (CHAR) and channelset_id_uuid (UUID)
        assert len(columns) == 2
