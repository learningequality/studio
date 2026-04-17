import Vue from 'vue';
// the new home for analytics
import { Analytics } from 'shared/composables/useAnalytics';

/**
 * @param Vue
 * @param {Object} options
 * @param {Array} options.dataLayer
 */
export default function AnalyticsPlugin(Vue, options = {}) {
  const analytics = new Analytics(options.dataLayer);

  // Merge in old dataLayer
  if (Vue.$analytics) {
    analytics.dataLayer.push(...Vue.$analytics.dataLayer);
    Vue.$analytics.destroy();
  }

  Vue.$analytics = analytics;
  Vue.mixin({
    computed: {
      // eslint-disable-next-line vue/no-unused-properties
      $analytics: () => analytics,
    },
  });
}

// Initialize with empty dataLayer
AnalyticsPlugin(Vue, { dataLayer: [] });
