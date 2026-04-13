# Stripe Subscription Integration

Studio uses [Stripe](https://stripe.com/) to offer paid storage upgrades via subscriptions. This document covers the architecture, configuration, and testing workflow.

## Architecture Overview

The integration uses Stripe's recommended approach for subscriptions:

- **Checkout Sessions** (`mode: "subscription"`) handle the initial payment flow
- **Per-unit pricing** at $15/GB/year — the user selects how many GB they want, which becomes the `quantity` on the Stripe line item
- **Customer Portal** lets users manage their subscription (cancel, update payment method, change quantity)
- **Webhooks** keep Studio in sync with Stripe's subscription lifecycle events
- **Dynamic payment methods** are configured in the Stripe Dashboard (not hardcoded)

### Data Model

`UserSubscription` is a separate model (one-to-one with `User`) that tracks:

- `stripe_customer_id` — Stripe's customer reference
- `stripe_subscription_id` — Stripe's subscription reference
- `stripe_subscription_status` — current status (`active`, `trialing`, `canceled`, etc.)
- `subscription_disk_space` — additional bytes granted by the subscription

The user's effective storage quota is `disk_space + subscription_disk_space` (computed by `User.get_effective_disk_space()`), so admin-granted quotas are preserved. Storage is derived from the Stripe subscription quantity: `quantity_gb * 1 GB`.

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/stripe/create-checkout-session/` | POST | Login required | Creates a Checkout Session, returns redirect URL |
| `/api/stripe/create-portal-session/` | POST | Login required | Creates a Customer Portal session |
| `/api/stripe/subscription-status/` | GET | Login required | Returns current user's subscription status |
| `/api/stripe/webhook/` | POST | CSRF exempt | Receives Stripe webhook events |

### Webhook Events Handled

| Event | Behavior |
|---|---|
| `checkout.session.completed` | Activates subscription, grants storage |
| `customer.subscription.updated` | Syncs status; revokes storage if no longer `active`/`trialing` |
| `customer.subscription.deleted` | Marks as canceled, revokes storage (fires after period ends) |

## Configuration

### Environment Variables

The integration uses **separate environment variables for test and live keys**, selected automatically based on `BRANCH_ENVIRONMENT`:

- **Production** (`BRANCH_ENVIRONMENT=master`): reads `STRIPE_LIVE_*` variables
- **All other environments** (QA, staging, dev): reads `STRIPE_TEST_*` variables

This means it is not possible for a non-production server to accidentally process real payments, even if it shares the same settings file.

| Variable | Description |
|---|---|
| `STRIPE_TEST_SECRET_KEY` | Stripe sandbox secret key (`sk_test_...`) — shared across all non-production deployments |
| `STRIPE_TEST_WEBHOOK_SECRET` | Webhook signing secret for this deployment's test endpoint — **unique per deployment** |
| `STRIPE_TEST_PRICE_ID` | Price ID for the sandbox subscription product — shared across all non-production deployments |
| `STRIPE_LIVE_SECRET_KEY` | Stripe live mode secret key (`sk_live_...`) |
| `STRIPE_LIVE_WEBHOOK_SECRET` | Webhook signing secret for the production endpoint |
| `STRIPE_LIVE_PRICE_ID` | Price ID for the live subscription product |

**Note on webhook secrets:** The secret key and price ID can be shared across QA/staging deployments since they belong to the same Stripe sandbox. However, each deployment needs its **own webhook endpoint** in Stripe (since each has a different URL), and therefore its own `STRIPE_TEST_WEBHOOK_SECRET`.

### Stripe Dashboard Setup

#### Sandbox (test) setup

1. Create a [Stripe sandbox](https://dashboard.stripe.com/test/developers) for non-production testing
2. In the sandbox, create a Product with a **Volume tiered recurring Price** at $15/unit/year with a single tier (each unit = 1 GB). Note: per-unit pricing at $15 hits Stripe's minimum price-per-unit threshold, so use Volume tiered pricing with one tier as a workaround.
3. Enable desired payment methods in Dashboard > Settings > Payment methods
4. Configure the Customer Portal in Dashboard > Settings > Customer portal (enable "Update subscriptions" for quantity changes and "Cancel subscriptions")
5. Create a **separate webhook endpoint for each deployment** (Developers > Event destinations):
   - `https://<unstable-domain>/api/stripe/webhook/`
   - `https://<hotfixes-domain>/api/stripe/webhook/`
   - Subscribe each to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Each endpoint gets its own signing secret (`whsec_...`)

#### Production setup

1. Create a Product and Price in live mode with the same structure as the sandbox
2. Create a single webhook endpoint for the production domain
3. Store the live keys via the secret management system (accessed via `get_secret()` in `production_settings.py`)

## Testing

### QA / Staging Servers

QA and staging servers automatically use Stripe **sandbox** keys (via `STRIPE_TEST_*` env vars). Sandbox mode is fully functional but never charges real money.

Set `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_PRICE_ID` from the sandbox (shared across deployments), and set `STRIPE_TEST_WEBHOOK_SECRET` from the webhook endpoint created for that specific deployment.

### Test Card Numbers

Stripe provides [test card numbers](https://docs.stripe.com/testing#cards) for simulating different scenarios:

| Card Number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0341` | Payment is declined |
| `4000 0000 0000 3220` | Requires 3D Secure authentication |
| `4000 0000 0000 3063` | Requires 3D Secure, then is declined |

Use any future expiry date, any 3-digit CVC, and any postal code.

### Local Development

For local development, use the [Stripe CLI](https://docs.stripe.com/stripe-cli) instead of creating a webhook endpoint in the dashboard. The CLI forwards sandbox events directly to your local server without needing a public URL.

#### Setup

1. Install the Stripe CLI: `brew install stripe/stripe-cli/stripe` (macOS) or see [install docs](https://docs.stripe.com/stripe-cli#install)
2. Set `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_PRICE_ID` in your environment
3. Run the combined dev server:

```bash
make devserver-stripe
```

This authenticates the Stripe CLI using your `STRIPE_TEST_SECRET_KEY`, starts the webhook listener, automatically extracts the signing secret, and launches `pnpm devserver` with everything configured. No separate `stripe login` or manual webhook secret needed.

#### Manual setup

If you prefer to run things separately:

```bash
# Terminal 1: start the Stripe listener
stripe listen --forward-to localhost:8080/api/stripe/webhook/
# Copy the whsec_... secret it prints

# Terminal 2: start the dev server with the secret
STRIPE_TEST_WEBHOOK_SECRET=whsec_... pnpm devserver
```

#### Testing the full flow

With the listener running, open Studio in your browser and go through the upgrade flow. The CLI will forward the resulting webhook events to your local server in real time.

You can also trigger events manually in a separate terminal to test specific scenarios:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### Unit Tests

Backend tests are in:
- `contentcuration/tests/test_user.py` (`UserEffectiveDiskSpaceTest`) — disk space calculation tests
- `contentcuration/tests/views/test_subscription.py` — view/webhook tests
