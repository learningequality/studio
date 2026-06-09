import logging
from datetime import datetime
from datetime import timezone

import stripe
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from contentcuration.models import User
from contentcuration.models import UserSubscription
from contentcuration.utils.urls import canonical_url

BYTES_PER_GB = 10 ** 9
MIN_STORAGE_GB = 1
MAX_STORAGE_GB = 50

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = settings.STRIPE_API_VERSION


class CheckoutSerializer(serializers.Serializer):
    storage_gb = serializers.IntegerField(
        min_value=MIN_STORAGE_GB, max_value=MAX_STORAGE_GB
    )


class CreateCheckoutSessionView(APIView):
    """
    Create a Stripe Checkout Session and return the URL for redirect.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        subscription = getattr(user, "subscription", None)
        if subscription and subscription.is_active:
            return Response(
                {"error": "You already have an active subscription"}, status=400
            )

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        storage_gb = serializer.validated_data["storage_gb"]

        try:
            success_url = canonical_url(
                "/settings/#/storage?upgrade=success", request=request
            )
            cancel_url = canonical_url("/settings/#/storage", request=request)

            checkout_session_params = {
                "mode": "subscription",
                "line_items": [
                    {
                        "price": settings.STRIPE_PRICE_ID,
                        "quantity": storage_gb,
                    }
                ],
                "success_url": success_url,
                "cancel_url": cancel_url,
                "client_reference_id": str(user.id),
                "customer_email": user.email,
            }

            if subscription and subscription.stripe_customer_id:
                checkout_session_params["customer"] = subscription.stripe_customer_id
                del checkout_session_params["customer_email"]

            session = stripe.checkout.Session.create(**checkout_session_params)

            return Response({"checkout_url": session.url})

        except stripe.error.StripeError:
            logger.exception("Stripe error creating checkout session")
            return Response({"error": "Unable to create checkout session"}, status=400)


class CreatePortalSessionView(APIView):
    """
    Create a Stripe Customer Portal session for subscription management.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        subscription = getattr(user, "subscription", None)

        if not subscription or not subscription.stripe_customer_id:
            return Response({"error": "No subscription found"}, status=400)

        try:
            session = stripe.billing_portal.Session.create(
                customer=subscription.stripe_customer_id,
                return_url=canonical_url("/settings/#/storage", request=request),
            )
            return Response({"portal_url": session.url})

        except stripe.error.StripeError:
            logger.exception("Stripe error creating portal session")
            return Response({"error": "Unable to create portal session"}, status=400)


class SubscriptionStatusView(APIView):
    """
    Returns subscription status for the current user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        subscription = getattr(user, "subscription", None)

        if not subscription:
            return Response(
                {
                    "status": None,
                    "is_active": False,
                    "storage_bytes": 0,
                    "cancel_at_period_end": False,
                }
            )

        data = {
            "status": subscription.stripe_subscription_status,
            "is_active": subscription.is_active,
            "storage_bytes": subscription.subscription_disk_space,
            "cancel_at_period_end": subscription.cancel_at_period_end,
        }
        if subscription.current_period_end:
            data["current_period_end"] = subscription.current_period_end.isoformat()

        return Response(data)


class CheckoutCompletedSerializer(serializers.Serializer):
    """Validates and processes checkout.session.completed events."""

    client_reference_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all()
    )
    customer = serializers.CharField()
    subscription = serializers.CharField()

    def save(self):
        data = self.validated_data

        # Retrieve the subscription to get the quantity (GB purchased).
        # Also set by customer.subscription.updated, but that webhook may
        # arrive later or not at all in some configurations.
        stripe_sub = stripe.Subscription.retrieve(data["subscription"])
        quantity_gb = stripe_sub["items"]["data"][0]["quantity"]

        UserSubscription.objects.update_or_create(
            user=data["client_reference_id"],
            defaults={
                "stripe_customer_id": data["customer"],
                "stripe_subscription_id": data["subscription"],
                "stripe_subscription_status": "active",
                "subscription_disk_space": quantity_gb * BYTES_PER_GB,
            },
        )


class SubscriptionDeletedSerializer(serializers.Serializer):
    """
    Validates and processes customer.subscription.deleted events.
    Fires only after the subscription has fully ended (including any
    remaining paid period), so it is safe to revoke storage here.
    """

    id = serializers.SlugRelatedField(
        slug_field="stripe_subscription_id",
        queryset=UserSubscription.objects.all(),
    )

    def save(self):
        sub = self.validated_data["id"]
        sub.stripe_subscription_status = "canceled"
        sub.subscription_disk_space = 0
        sub.save()


class TimestampField(serializers.IntegerField):
    """Converts a Unix timestamp to a timezone-aware datetime."""

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return datetime.fromtimestamp(value, tz=timezone.utc)


class SubscriptionItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField()


class SubscriptionItemsDataSerializer(serializers.Serializer):
    data = SubscriptionItemSerializer(many=True)


STRIPE_SUBSCRIPTION_STATUSES = [
    "active",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "past_due",
    "paused",
    "trialing",
    "unpaid",
]


class SubscriptionUpdatedSerializer(serializers.Serializer):
    """Validates and processes customer.subscription.updated events."""

    id = serializers.SlugRelatedField(
        slug_field="stripe_subscription_id",
        queryset=UserSubscription.objects.all(),
    )
    status = serializers.ChoiceField(choices=STRIPE_SUBSCRIPTION_STATUSES)
    cancel_at_period_end = serializers.BooleanField(default=False)
    cancel_at = serializers.IntegerField(allow_null=True, default=None)
    current_period_end = TimestampField(required=False)
    items = SubscriptionItemsDataSerializer()

    def save(self):
        sub = self.validated_data["id"]
        data = self.validated_data
        new_status = data["status"]
        sub.stripe_subscription_status = new_status

        sub.cancel_at_period_end = (
            data["cancel_at_period_end"] or data["cancel_at"] is not None
        )

        if data.get("current_period_end"):
            sub.current_period_end = data["current_period_end"]

        if new_status in ("active", "trialing"):
            quantity_gb = data["items"]["data"][0]["quantity"]
            sub.subscription_disk_space = quantity_gb * BYTES_PER_GB
        else:
            sub.subscription_disk_space = 0

        sub.save()


_webhook_serializers = {
    "checkout.session.completed": CheckoutCompletedSerializer,
    "customer.subscription.deleted": SubscriptionDeletedSerializer,
    "customer.subscription.updated": SubscriptionUpdatedSerializer,
}


@csrf_exempt
@require_POST
def stripe_webhook(request):
    try:
        event = stripe.Webhook.construct_event(
            request.body,
            request.META.get("HTTP_STRIPE_SIGNATURE"),
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return JsonResponse({"error": "Invalid payload or signature"}, status=400)

    serializer_class = _webhook_serializers.get(event["type"])
    if serializer_class:
        serializer = serializer_class(data=event["data"]["object"])
        if serializer.is_valid():
            serializer.save()
        else:
            logger.warning(
                f"Invalid webhook payload for {event['type']}: {serializer.errors}"
            )

    return JsonResponse({"status": "success"})
