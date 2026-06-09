import { ref, computed } from 'vue';
import client from 'shared/client';
import urls from 'shared/urls';

/**
 * Composable for managing subscription state and actions.
 * State is component-scoped (not global) - each component instance gets fresh state.
 */
export function useSubscription() {
  const subscription = ref(null);
  const loading = ref(false);
  const redirecting = ref(false);
  const error = ref(null);

  const isActive = computed(() => subscription.value?.is_active || false);
  const storageBytes = computed(() => subscription.value?.storage_bytes || 0);
  const cancelAtPeriodEnd = computed(() => subscription.value?.cancel_at_period_end || false);
  const currentPeriodEnd = computed(() => subscription.value?.current_period_end || null);

  const fetchSubscriptionStatus = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await client.get(urls.stripe_subscription_status());
      subscription.value = response.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const _redirectToStripe = async (url, body, urlField) => {
    redirecting.value = true;
    error.value = null;
    try {
      const response = await client.post(url, body);
      if (response.data[urlField]) {
        window.location.href = response.data[urlField];
      }
    } catch (err) {
      error.value = true;
      redirecting.value = false;
      throw err;
    }
  };

  const createCheckoutSession = storageGb =>
    _redirectToStripe(
      urls.stripe_create_checkout_session(),
      { storage_gb: storageGb },
      'checkout_url',
    );

  const createPortalSession = () =>
    _redirectToStripe(urls.stripe_create_portal_session(), null, 'portal_url');

  return {
    loading,
    redirecting,
    error,
    isActive,
    storageBytes,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    fetchSubscriptionStatus,
    createCheckoutSession,
    createPortalSession,
  };
}
