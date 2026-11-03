import pickBy from 'lodash/pickBy';

/**
 * The settings in `state` the author changed from the value each starts at, for a type to
 * export: only those are worth carrying to another type, or saying are lost.
 *
 * @param {object} state - The interaction's state, which holds each setting by its name
 * @param {Object<string, *>} defaults - Each setting to look at, and the value it starts at
 * @returns {Object<string, *>} The changed settings, and their values
 */
export function changedSettings(state, defaults) {
  return pickBy(
    Object.fromEntries(Object.keys(defaults).map(setting => [setting, state[setting]])),
    (value, setting) => value !== defaults[setting],
  );
}
