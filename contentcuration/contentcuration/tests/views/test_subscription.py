from unittest import mock

import stripe
from django.contrib.sites.models import Site
from django.test import override_settings
from django.urls import reverse

from contentcuration.models import UserSubscription
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


@override_settings(
    STRIPE_SECRET_KEY="sk_test_fake",
    STRIPE_PRICE_ID="price_test_fake",
)
class CreateCheckoutSessionViewTest(StudioAPITestCase):
    def setUp(self):
        self.user = testdata.user(email="checkout@test.com")
        self.url = reverse("stripe_create_checkout_session")

    def test_requires_authentication(self):
        """Unauthenticated users should be rejected."""
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 403)

    @mock.patch("contentcuration.views.subscription.stripe.checkout.Session.create")
    def test_creates_checkout_session(self, mock_create):
        """Authenticated user can create checkout session."""
        mock_create.return_value = mock.Mock(url="https://checkout.stripe.com/test")

        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            data={"storage_gb": 10},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["checkout_url"], "https://checkout.stripe.com/test")

    @mock.patch("contentcuration.views.subscription.stripe.checkout.Session.create")
    def test_rejects_user_with_active_subscription(self, mock_create):
        """User with active subscription cannot create new checkout."""
        UserSubscription.objects.create(
            user=self.user,
            stripe_subscription_status="active",
        )

        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            data={"storage_gb": 10},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        mock_create.assert_not_called()

    @override_settings(SITE_ID=1)
    @mock.patch("contentcuration.views.subscription.stripe.checkout.Session.create")
    def test_checkout_urls_use_canonical_site_domain(self, mock_create):
        Site.objects.update_or_create(
            pk=1, defaults={"domain": "studio.learningequality.org", "name": "Studio"}
        )
        mock_create.return_value = mock.Mock(url="https://checkout.stripe.com/test")

        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            data={"storage_gb": 10},
            format="json",
            HTTP_HOST="master.studio.learningequality.org",
        )

        self.assertEqual(response.status_code, 200)
        call_kwargs = mock_create.call_args[1]
        for key in ("success_url", "cancel_url"):
            url = call_kwargs[key]
            self.assertNotIn(
                "master.studio.learningequality.org",
                url,
                f"{key} leaked internal hostname: {url}",
            )
            self.assertIn("studio.learningequality.org", url)

    @mock.patch("contentcuration.views.subscription.stripe.checkout.Session.create")
    def test_user_with_canceled_subscription_can_checkout_again(self, mock_create):
        """User whose subscription was canceled can create a new checkout session."""
        UserSubscription.objects.create(
            user=self.user,
            stripe_customer_id="cus_test123",
            stripe_subscription_id="sub_old",
            stripe_subscription_status="canceled",
            subscription_disk_space=0,
        )
        mock_create.return_value = mock.Mock(url="https://checkout.stripe.com/new")

        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            data={"storage_gb": 5},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["checkout_url"], "https://checkout.stripe.com/new")
        # Should reuse the existing customer ID
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args[1]
        self.assertEqual(call_kwargs["customer"], "cus_test123")


@override_settings(
    STRIPE_SECRET_KEY="sk_test_fake",
)
class CreatePortalSessionViewTest(StudioAPITestCase):
    def setUp(self):
        self.user = testdata.user(email="portal@test.com")
        self.url = reverse("stripe_create_portal_session")

    def test_requires_authentication(self):
        """Unauthenticated users should be rejected."""
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 403)

    def test_rejects_user_without_subscription(self):
        """User without subscription cannot access portal."""
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 400)

    @mock.patch(
        "contentcuration.views.subscription.stripe.billing_portal.Session.create"
    )
    def test_creates_portal_session(self, mock_create):
        """User with subscription can create portal session."""
        UserSubscription.objects.create(
            user=self.user,
            stripe_customer_id="cus_test123",
            stripe_subscription_status="active",
        )
        mock_create.return_value = mock.Mock(url="https://billing.stripe.com/test")

        self.client.force_authenticate(self.user)
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["portal_url"], "https://billing.stripe.com/test")

    @override_settings(SITE_ID=1)
    @mock.patch(
        "contentcuration.views.subscription.stripe.billing_portal.Session.create"
    )
    def test_portal_return_url_uses_canonical_site_domain(self, mock_create):
        Site.objects.update_or_create(
            pk=1, defaults={"domain": "studio.learningequality.org", "name": "Studio"}
        )
        UserSubscription.objects.create(
            user=self.user,
            stripe_customer_id="cus_test123",
            stripe_subscription_status="active",
        )
        mock_create.return_value = mock.Mock(url="https://billing.stripe.com/test")

        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url, HTTP_HOST="master.studio.learningequality.org"
        )

        self.assertEqual(response.status_code, 200)
        return_url = mock_create.call_args[1]["return_url"]
        self.assertNotIn(
            "master.studio.learningequality.org",
            return_url,
            f"return_url leaked internal hostname: {return_url}",
        )
        self.assertIn("studio.learningequality.org", return_url)


@override_settings(
    STRIPE_SECRET_KEY="sk_test_fake",
)
class GetSubscriptionStatusViewTest(StudioAPITestCase):
    def setUp(self):
        self.user = testdata.user(email="status@test.com")
        self.url = reverse("stripe_subscription_status")

    def test_requires_authentication(self):
        """Unauthenticated users should be rejected."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_returns_no_subscription(self):
        """User without subscription gets appropriate response."""
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["is_active"])

    def test_returns_active_subscription(self):
        """User with active subscription gets appropriate response."""
        UserSubscription.objects.create(
            user=self.user,
            stripe_subscription_status="active",
            subscription_disk_space=50 * 1024 * 1024 * 1024,
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_active"])
        self.assertEqual(data["status"], "active")


@override_settings(
    STRIPE_SECRET_KEY="sk_test_fake",
    STRIPE_WEBHOOK_SECRET="whsec_test_fake",
)
class StripeWebhookViewTest(StudioAPITestCase):
    def setUp(self):
        self.user = testdata.user(email="webhook@test.com")
        self.webhook_url = reverse("stripe_webhook")

    @mock.patch("contentcuration.views.subscription.stripe.Subscription.retrieve")
    @mock.patch("contentcuration.views.subscription.stripe.Webhook.construct_event")
    def test_handles_checkout_completed(self, mock_construct, mock_retrieve):
        """Webhook activates subscription on checkout.session.completed."""
        mock_construct.return_value = {
            "id": "evt_test",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test",
                    "client_reference_id": str(self.user.id),
                    "customer": "cus_test123",
                    "subscription": "sub_test123",
                }
            },
        }
        mock_retrieve.return_value = {
            "items": {"data": [{"quantity": 10}]},
        }

        response = self.client.post(
            self.webhook_url,
            data="{}",
            format="json",
            HTTP_STRIPE_SIGNATURE="test_sig",
        )

        self.assertEqual(response.status_code, 200)

        # Verify subscription was created
        self.user.refresh_from_db()
        subscription = self.user.subscription
        self.assertEqual(subscription.stripe_customer_id, "cus_test123")
        self.assertEqual(subscription.stripe_subscription_id, "sub_test123")
        self.assertEqual(subscription.stripe_subscription_status, "active")
        self.assertEqual(subscription.subscription_disk_space, 10 * 10 ** 9)

    @mock.patch("contentcuration.views.subscription.stripe.Webhook.construct_event")
    def test_handles_subscription_deleted(self, mock_construct):
        """Webhook revokes access on customer.subscription.deleted."""
        subscription = UserSubscription.objects.create(
            user=self.user,
            stripe_customer_id="cus_test123",
            stripe_subscription_id="sub_test123",
            stripe_subscription_status="active",
            subscription_disk_space=50 * 1024 * 1024 * 1024,
        )

        mock_construct.return_value = {
            "id": "evt_test",
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                }
            },
        }

        response = self.client.post(
            self.webhook_url,
            data="{}",
            format="json",
            HTTP_STRIPE_SIGNATURE="test_sig",
        )

        self.assertEqual(response.status_code, 200)

        subscription.refresh_from_db()
        self.assertEqual(subscription.stripe_subscription_status, "canceled")
        self.assertEqual(subscription.subscription_disk_space, 0)

    @mock.patch("contentcuration.views.subscription.stripe.Webhook.construct_event")
    def test_handles_subscription_updated(self, mock_construct):
        """Webhook updates status on customer.subscription.updated."""
        subscription = UserSubscription.objects.create(
            user=self.user,
            stripe_customer_id="cus_test123",
            stripe_subscription_id="sub_test123",
            stripe_subscription_status="active",
            subscription_disk_space=50 * 1024 * 1024 * 1024,
        )

        mock_construct.return_value = {
            "id": "evt_test",
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "status": "past_due",
                    "cancel_at_period_end": False,
                    "items": {"data": [{"quantity": 50}]},
                }
            },
        }

        response = self.client.post(
            self.webhook_url,
            data="{}",
            format="json",
            HTTP_STRIPE_SIGNATURE="test_sig",
        )

        self.assertEqual(response.status_code, 200)

        subscription.refresh_from_db()
        self.assertEqual(subscription.stripe_subscription_status, "past_due")

    @mock.patch("contentcuration.views.subscription.stripe.Webhook.construct_event")
    def test_handles_cancel_at_period_end(self, mock_construct):
        """Webhook sets cancel_at_period_end when user cancels via portal."""
        subscription = UserSubscription.objects.create(
            user=self.user,
            stripe_customer_id="cus_test123",
            stripe_subscription_id="sub_test123",
            stripe_subscription_status="active",
            subscription_disk_space=5 * 10 ** 9,
        )

        mock_construct.return_value = {
            "id": "evt_test",
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "status": "active",
                    "cancel_at_period_end": False,
                    "cancel_at": 1806883200,
                    "current_period_end": 1806883200,
                    "items": {"data": [{"quantity": 5}]},
                }
            },
        }

        response = self.client.post(
            self.webhook_url,
            data="{}",
            format="json",
            HTTP_STRIPE_SIGNATURE="test_sig",
        )

        self.assertEqual(response.status_code, 200)

        subscription.refresh_from_db()
        self.assertEqual(subscription.stripe_subscription_status, "active")
        self.assertTrue(subscription.cancel_at_period_end)
        self.assertIsNotNone(subscription.current_period_end)
        # Storage preserved — still active until period end
        self.assertEqual(subscription.subscription_disk_space, 5 * 10 ** 9)

    @mock.patch("contentcuration.views.subscription.stripe.Webhook.construct_event")
    def test_rejects_invalid_signature(self, mock_construct):
        """Webhook rejects invalid signatures."""
        mock_construct.side_effect = stripe.error.SignatureVerificationError(
            "Invalid signature", "sig"
        )

        response = self.client.post(
            self.webhook_url,
            data="{}",
            format="json",
            HTTP_STRIPE_SIGNATURE="bad_sig",
        )

        self.assertEqual(response.status_code, 400)

    @mock.patch("contentcuration.views.subscription.stripe.Subscription.retrieve")
    @mock.patch("contentcuration.views.subscription.stripe.Webhook.construct_event")
    def test_idempotent_checkout_processing(self, mock_construct, mock_retrieve):
        """Same checkout event processed twice doesn't duplicate."""
        mock_retrieve.return_value = {
            "items": {"data": [{"quantity": 10}]},
        }
        UserSubscription.objects.create(
            user=self.user,
            stripe_customer_id="cus_test123",
            stripe_subscription_id="sub_test123",
            stripe_subscription_status="active",
        )

        mock_construct.return_value = {
            "id": "evt_test",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test",
                    "client_reference_id": str(self.user.id),
                    "customer": "cus_test123",
                    "subscription": "sub_test123",
                }
            },
        }

        response = self.client.post(
            self.webhook_url,
            data="{}",
            format="json",
            HTTP_STRIPE_SIGNATURE="test_sig",
        )

        self.assertEqual(response.status_code, 200)
        # Should still only have one subscription
        self.assertEqual(UserSubscription.objects.filter(user=self.user).count(), 1)
