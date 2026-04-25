// the new home for analytics
import { Analytics } from 'shared/composables/useAnalytics';

/**
 * @param Vue
 */
export default function AnalyticsPlugin(Vue) {
  const analytics = Analytics.getInstance();

  Vue.$analytics = analytics;
  Vue.mixin({
    computed: {
      // eslint-disable-next-line vue/no-unused-properties
      $analytics: () => analytics,
    },
  });
}
