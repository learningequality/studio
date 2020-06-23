/**
 * Binds events to another component such that they propagate from `emitter` to `recipient`
 *
 * @param {String[]} events
 * @param {VueComponent} emitter
 * @param {VueComponent} recipient
 * @return {Function} A function that will remove listeners
 */
export function bindEventHandling(events, emitter, recipient) {
  const isPrimary = false;
  const listeners = events.map(eventName => {
    const listener = {
      name: eventName,
      callback: e => recipient.$emit(eventName, e, isPrimary),
    };

    emitter.$on(eventName, listener.callback);
    return listener;
  });

  return () => {
    listeners.forEach(listener => {
      emitter.$off(listener.name, listener.callback);
    });
  };
}
