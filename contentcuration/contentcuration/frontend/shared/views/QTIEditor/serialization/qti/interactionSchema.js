/**
 * Interaction schema registry.
 *
 * Maps each QuestionType (UI concept) to the QTI declaration shape it requires:
 * the interaction tag, base-type, cardinality, and which capabilities are valid.
 *
 * This is the single source of truth for QTIDeclaration.forType() and
 * QTIDeclaration.convertTo(). Adding support for a new interaction type requires
 * only adding an entry here — the parsing and serialization layer does not change.
 *
 * @module serialization/qti/interactionSchema
 */
import { QuestionType, QtiInteraction, Cardinality, BaseType } from '../../constants.js';
import { CAPABILITY } from './declarations/index.js';

/**
 * @typedef {object} DeclarationSchema
 * @property {string}   interaction  - QtiInteraction tag name
 * @property {string}   baseType     - Required QTI base-type value
 * @property {string}   cardinality  - Required QTI cardinality value
 * @property {string[]} capabilities - Valid CAPABILITY keys for this type
 */

/**
 * Schema registry: QuestionType → declaration shape.
 * Expand this object to support additional interaction types.
 *
 * @type {Object.<string, DeclarationSchema>}
 */
export const INTERACTION_SCHEMA = Object.freeze({
  [QuestionType.SINGLE_SELECT]: {
    interaction: QtiInteraction.CHOICE,
    baseType: BaseType.IDENTIFIER,
    cardinality: Cardinality.SINGLE,
    capabilities: [CAPABILITY.CORRECT_RESPONSE, CAPABILITY.DEFAULT_VALUE, CAPABILITY.MAPPING],
  },

  [QuestionType.MULTI_SELECT]: {
    interaction: QtiInteraction.CHOICE,
    baseType: BaseType.IDENTIFIER,
    cardinality: Cardinality.MULTIPLE,
    capabilities: [CAPABILITY.CORRECT_RESPONSE, CAPABILITY.DEFAULT_VALUE, CAPABILITY.MAPPING],
  },
});

/**
 * Look up the schema for a given QuestionType.
 *
 * @param {string} questionType - One of QuestionType.*
 * @returns {DeclarationSchema|undefined}
 */
export function getSchemaForType(questionType) {
  return INTERACTION_SCHEMA[questionType];
}

/**
 * Return true when two question types share the same base-type, meaning
 * correctResponse values can be reused on a type conversion.
 *
 * @param {string} fromType - Source QuestionType
 * @param {string} toType   - Target QuestionType
 * @returns {boolean}
 */
export function isBaseTypeCompatible(fromType, toType) {
  const from = INTERACTION_SCHEMA[fromType];
  const to = INTERACTION_SCHEMA[toType];
  if (!from || !to) return false;
  return from.baseType === to.baseType;
}
