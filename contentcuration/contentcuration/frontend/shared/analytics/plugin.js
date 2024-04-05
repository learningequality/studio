import Vue from 'vue';
import isFunction from 'lodash/isFunction';

/**
 * Analytics class for handling anything analytics related, exposed in Vue as $analytics
 */
class Analytics {
  /**
   * GTM uses an array-like structure called the `dataLayer`
   *
   * @param {Array} dataLayer
   */
  constructor(dataLayer) {
    this.counter = 0;
    this.dataLayer = dataLayer;
    this.lastLength = 0;

    // add interval to trigger resets every 5 minutes
    this.resetInterval = setInterval(() => {
      this.reset();
    }, 5 * 60 * 1000);
  }

  /**
   * Resets the datalayer and cleans up elements
   */
  reset() {
    // If the dataLayer hasn't changed since our last reset, skip
    if (this.dataLayer.length === this.lastLength) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info('Skipping Analytics.reset()');
      }
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('Analytics.reset()');
    }

    // Add local variable so the pushed reset function can access the datalayer
    const dataLayer = this.dataLayer;
    const resetCounter = this.counter;
    this.counter++;

    // This can't use an arrow function, it will be called with a different
    // context to access `this.reset()`
    const dataLayerReset = function() {
      // See https://developers.google.com/tag-platform/devguides/datalayer#reset
      this.reset();

      for (const item of dataLayer) {
        // Do our own reset of the `gtm.element` variable
        if (item['gtm.element']) {
          item['gtm.element'] = null;
        }
        // Be sure we stop when we reach this function's position in the dataLayer. The dataLayer
        // is like a FIFO queue, so by queuing this function and having the GTM execute it, we're
        // ensuring that everything prior to this function was processed. For this reason, we stop
        // once we reach the position of this function to avoid manipulating events that have been
        // added afterwards
        if (isFunction(item) && item['counter'] === resetCounter) {
          break;
        }
      }
    };
    dataLayerReset.counter = resetCounter;

    this.dataLayer.push(dataLayerReset);
    this.lastLength = this.dataLayer.length;
  }

  /**
   * Push data onto the datalayer
   * @param {object|function} args
   */
  push(...args) {
    this.dataLayer.push(...args);
  }

  /**
   * Push an event into the dataLayer
   *
   * These events could be standard GA events, or custom events that trigger tags within GTM
   *
   * @param {String} event
   * @param {{:*}} data
   */
  trackEvent(event, data = {}) {
    this.push({
      ...data,
      event,
    });

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`Analytics.trackEvent("${event}", ${JSON.stringify(data)})`);
    }
  }

  /**
   * Tracks event with specific action
   *
   * @param {String} event
   * @param {String} eventAction
   * @param {{:*}} data
   */
  trackAction(event, eventAction, data = {}) {
    this.trackEvent(event, { ...data, eventAction });
  }

  /**
   * Tracks event with click action
   *
   * @param {String} event
   * @param {String} eventLabel
   * @param {{:*}} data
   */
  trackClick(event, eventLabel, data = {}) {
    this.trackAction(event, 'Click', { ...data, eventLabel });
  }

  /**
   * Pushes current channel data into the data layer for GTM to associate with events
   *
   * @param {Object} channel
   * @param {Boolean} staging
   */
  trackCurrentChannel(channel, staging = false) {
    // We only want to track once, since a page reload is required to open a new channel
    const hasCurrentChannel = this.dataLayer.find(data => Boolean(data['currentChannel']));
    if (hasCurrentChannel) {
      return;
    }

    this.push({
      currentChannel: {
        id: channel.id,
        name: channel.name,
        lastPublished: channel.last_published,
        isPublic: channel.public,
        allowEdit: channel.edit,
        staging,
        // Skipping this field for now as we don't have this info on the frontend by default
        // hasEditors:
      },
    });
  }

  /**
   * Cleans up the datalayer and removes the interval to call dataLayer.reset()
   */
  destroy() {
    clearInterval(this.resetInterval);
    this.dataLayer = null;
  }
}

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
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      $analytics: () => analytics,
    },
  });
}

// Initialize with empty dataLayer
AnalyticsPlugin(Vue, { dataLayer: [] });
