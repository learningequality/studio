/**
 * Track an event to analytics providers (e.g. Google Analytics, Mixpanel).
 *
 * @param {string} eventCategory Typically the object interacted with, e.g. 'Clipboard'
 * @param {string} eventAction The type of interaction, e.g. 'Add item'
 * @param {string} [eventLabel] The label for the event, e.g. 'A content node title'
 * @param {object} [eventExtraData]
 */
function track(eventCategory, eventAction, eventLabel = '', eventExtraData = null) {
  // eslint-disable-next-line no-console
  console.log(
    `Tracking analytics event "${eventCategory}: ${eventAction}"`,
    eventLabel,
    eventExtraData
  );

  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'studio_v1',
      eventCategory,
      eventAction,
      eventLabel,
      eventExtraData,
    });
  }
}

module.exports = {
  track: track,
};
