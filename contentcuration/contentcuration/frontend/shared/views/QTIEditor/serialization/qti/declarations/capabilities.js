/**
 * Capability name constants for QTI declaration objects.
 *
 * Used as keys when declaration strategy classes register themselves on a
 * QTIDeclaration, and when QTIDeclaration looks them up via its getters.
 * Constants prevent silent failures from typos in capability key names.
 *
 * A capability may provide getScoringRule(outcomeIdentifier), chosen by
 * QTIDeclaration's SCORING_PRECEDENCE. SCORE and LOOKUP from the Kolibri original
 * are intentionally omitted — the editor writes scoring rules, never evaluates them.
 */

/** @enum {string} */
export const CAPABILITY = Object.freeze({
  CORRECT_RESPONSE: 'correctResponse',
  DEFAULT_VALUE: 'defaultValue',
  MAPPING: 'mapping',
  AREA_MAPPING: 'areaMapping',
});
