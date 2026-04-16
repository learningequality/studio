<template>

  <div
    class="subscription-card"
    :style="{ backgroundColor: $themePalette.grey.v_100 }"
  >
    <div
      v-if="show('loader', loading, 400)"
      class="loading"
    >
      <KCircularLoader :disableDefaultTransition="true" />
    </div>

    <div
      v-else-if="isActive"
      class="active-subscription"
    >
      <div class="status-header">
        <KIcon
          icon="check"
          :color="cancelAtPeriodEnd ? $themeTokens.annotation : $themeTokens.success"
        />
        <span class="status-text">
          {{ cancelAtPeriodEnd ? $tr('subscriptionCanceling') : $tr('subscriptionActive') }}
        </span>
      </div>
      <StudioBanner
        v-if="showSuccessMessage"
        class="success-banner"
        :style="{ backgroundColor: $themePalette.green.v_100, color: $themePalette.green.v_700 }"
      >
        {{ $tr('upgradeSuccess', { size: subscriptionGb }) }}
        <KIconButton
          icon="close"
          :ariaLabel="$tr('dismiss')"
          :size="'small'"
          :color="$themePalette.green.v_400"
          class="dismiss-btn"
          @click="showSuccessMessage = false"
        />
      </StudioBanner>
      <p
        class="storage-info"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ $tr('storageIncluded', { size: subscriptionGb }) }}
      </p>
      <p
        v-if="currentPeriodEnd"
        class="period-notice"
        :style="{ color: cancelAtPeriodEnd ? $themeTokens.error : $themeTokens.annotation }"
      >
        {{
          cancelAtPeriodEnd
            ? $tr('cancelNotice', { date: periodEndDate })
            : $tr('renewalNotice', { date: periodEndDate })
        }}
      </p>
      <KButton
        :text="$tr('manageSubscription')"
        appearance="basic-link"
        @click="handleManageClick"
      />
    </div>

    <div
      v-else
      class="upgrade-prompt"
    >
      <h3>{{ $tr('instantUpgrade') }}</h3>
      <p>{{ $tr('upgradeDescription') }}</p>
      <div class="storage-selector">
        <KTextbox
          v-model="selectedGb"
          type="number"
          :label="$tr('storageAmount')"
          :min="1"
          :max="50"
          :invalid="!isValidGb"
          :invalidText="$tr('storageRange')"
          :showInvalidText="true"
          class="gb-input"
        />
        <span class="price-display">
          {{ $tr('annualPrice', { price: validGb * PRICE_PER_GB }) }}
        </span>
      </div>
      <KButton
        :primary="true"
        :disabled="!isValidGb || redirecting"
        class="upgrade-btn"
        @click="handleUpgradeClick"
      >
        <span class="upgrade-btn-content">
          <KCircularLoader
            v-if="show('redirecting', redirecting, 400)"
            :disableDefaultTransition="true"
            :size="24"
            :stroke="3"
            class="upgrade-btn-loader"
          />
          <span :style="{ visibility: redirecting ? 'hidden' : 'visible' }">
            {{ $tr('upgradeNow') }}
          </span>
        </span>
      </KButton>
    </div>

    <StudioBanner
      v-if="error"
      error
      class="error-banner"
    >
      {{ $tr('genericError') }}
    </StudioBanner>
  </div>

</template>


<script>

  import { ref, computed, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import { useSubscription } from './useSubscription';
  import { ONE_GB } from 'shared/constants';
  import StudioBanner from 'shared/views/StudioBanner';

  const MIN_GB = 1;
  const MAX_GB = 50;
  const PRICE_PER_GB = 15;

  export default {
    name: 'SubscriptionCard',
    components: {
      StudioBanner,
    },
    setup() {
      const {
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
      } = useSubscription();

      const { show } = useKShow();
      const showSuccessMessage = ref(false);
      const selectedGb = ref(10);

      const route = useRoute();
      const router = useRouter();

      fetchSubscriptionStatus();

      watch(
        () => route.query.upgrade,
        val => {
          if (val === 'success') {
            showSuccessMessage.value = true;
            router.replace({ query: {} });
          }
        },
        { immediate: true },
      );

      const subscriptionGb = computed(() => {
        if (storageBytes.value) {
          return `${Math.round(storageBytes.value / ONE_GB)} GB`;
        }
        return `${MIN_GB} GB`;
      });

      const periodEndDate = computed(() => {
        if (!currentPeriodEnd.value) {
          return null;
        }
        return new Date(currentPeriodEnd.value);
      });

      const validGb = computed(() => {
        const n = Number(selectedGb.value);
        if (!Number.isInteger(n) || n < MIN_GB || n > MAX_GB) {
          return MIN_GB;
        }
        return n;
      });

      const isValidGb = computed(() => {
        const n = Number(selectedGb.value);
        return Number.isInteger(n) && n >= MIN_GB && n <= MAX_GB;
      });

      const handleUpgradeClick = () => {
        createCheckoutSession(Number(selectedGb.value));
      };

      const handleManageClick = () => {
        createPortalSession();
      };

      return {
        show,
        loading,
        redirecting,
        error,
        isActive,
        cancelAtPeriodEnd,
        currentPeriodEnd,
        showSuccessMessage,
        selectedGb,
        subscriptionGb,
        periodEndDate,
        validGb,
        isValidGb,
        PRICE_PER_GB,
        handleUpgradeClick,
        handleManageClick,
      };
    },
    $trs: {
      instantUpgrade: 'Instant Storage Upgrade',
      upgradeDescription: 'Purchase additional storage at $15/GB per year.',
      upgradeNow: 'Upgrade Now',
      storageAmount: 'Storage (GB)',
      storageRange: 'Enter a value between 1 and 50',
      annualPrice: '${price, number}/year',
      subscriptionActive: 'Storage Subscription Active',
      subscriptionCanceling: 'Subscription Canceling',
      cancelNotice:
        'Your subscription will expire on {date, date, medium}. Storage will be removed after that.',
      renewalNotice: 'Your subscription will automatically renew on {date, date, medium}.',
      storageIncluded: '{size} included with your subscription',
      manageSubscription: 'Manage Subscription',
      upgradeSuccess: 'Storage increased to {size}',
      dismiss: 'Dismiss',
      genericError: 'There was a problem connecting to our payment provider. Please try again.',
    },
  };

</script>


<style lang="scss" scoped>

  .subscription-card {
    max-width: 500px;
    padding: 24px;
    margin-bottom: 24px;
    border-radius: 8px;
  }

  .loading {
    display: flex;
    justify-content: center;
    padding: 16px;
  }

  .status-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .status-text {
    margin-left: 8px;
    font-weight: bold;
  }

  .storage-info {
    margin-bottom: 16px;
  }

  .period-notice {
    margin-bottom: 16px;
    font-size: 0.9em;
  }

  .upgrade-prompt h3 {
    margin-top: 0;
    margin-bottom: 8px;
  }

  .upgrade-prompt p {
    margin-bottom: 16px;
  }

  .storage-selector {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .gb-input {
    max-width: 120px;
  }

  .price-display {
    padding-top: 24px;
    font-weight: bold;
  }

  .upgrade-btn-content {
    display: inline-grid;
    align-items: center;
    justify-items: center;
  }

  .upgrade-btn-content > * {
    grid-area: 1 / 1;
  }

  .error-banner {
    margin-top: 16px;
  }

  .success-banner {
    align-items: center;
    margin-bottom: 12px;
    border-radius: 4px;
  }

  .dismiss-btn {
    margin-left: auto;
  }

</style>
