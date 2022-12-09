#!/usr/bin/env python
from django.test import TestCase
from le_utils import proquint

from contentcuration.models import SecretToken


class SecretTokenTestCase(TestCase):
    """
    Tests for the SecretToken class.
    """

    def test_exists_returns_true_if_token_exists(self):
        """
        Check that SecretToken.exists() returns true if
        the token already exists in the database.
        """

        token = proquint.generate()
        # check that the proquint we just generated doesn't
        # exist yet.
        assert not SecretToken.exists(token)

        # save the new token and check if it exists
        SecretToken.objects.create(token=token, is_primary=True)
        assert SecretToken.exists(token)
