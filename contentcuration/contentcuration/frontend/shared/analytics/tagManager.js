export default function(params) {
  // Simple wrapper function for pushing an event to GTM
  window.dataLayer.push({
    ...params,
  });
}
