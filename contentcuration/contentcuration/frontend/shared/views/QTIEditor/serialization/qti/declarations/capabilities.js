/**
 * Capability name constants for QTI declaration objects.
 *
 * Used as keys when declaration strategy classes register themselves on a
 * QTIDeclaration, and when QTIDeclaration looks them up via its getters.
 * Constants prevent silent failures from typos in capability key names.
 *
 * SCORE and LOOKUP from the Kolibri original are intentionally omitted —
 * the authoring editor carries no runtime scoring or lookup-table logic.
 */

/** @enum {string} */
export const CAPABILITY = Object.freeze({
  CORRECT_RESPONSE: 'correctResponse',
  DEFAULT_VALUE: 'defaultValue',
  MAPPING: 'mapping',
  AREA_MAPPING: 'areaMapping',
});
