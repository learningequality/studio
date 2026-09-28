/**
 * Base class for every interaction descriptor.
 *
 * A descriptor owns everything about one QTI interaction except how it looks: recognising
 * its element, resolving which question type an element represents, parsing XML to state,
 * building XML back, and validating that state. The Vue editor is deliberately not part of
 * it, so that headless parse/validation does not import any .vue components.
 *
 * The contract is checked as the descriptor is constructed, which happens at import time
 * for the module singletons.
 */

import { Placement } from '../constants';

/**
 * Methods a subclass has to implement. `matches` and `getTypeOptions` are not listed
 * because this class provides usable defaults for them.
 */
const REQUIRED_METHODS = [
  'getQuestionType',
  'getResponseDeclarationSchema',
  'parse',
  'buildXML',
  'validate',
];

export class InteractionDescriptor {
  /**
   * @param {object} options
   * @param {string} options.type - The interaction's XML tag name, e.g. 'qti-choice-interaction'
   * @param {string[]} options.questionTypes - QuestionType values this interaction can author
   * @param {string} [options.placement] - Placement.BLOCK (default) or Placement.INLINE.
   *   Inline interactions are handed the whole item body to parse, since their prompt lives
   *   in the body around them rather than in a `<qti-prompt>` child.
   */
  constructor({ type, questionTypes, placement = Placement.BLOCK } = {}) {
    const name = this.constructor.name;

    if (!type) {
      throw new Error(`${name}: type is required`);
    }
    if (!Array.isArray(questionTypes) || !questionTypes.length) {
      throw new Error(`${name}: questionTypes must list at least one question type`);
    }

    if (!Object.values(Placement).includes(placement)) {
      throw new Error(`${name}: placement must be one of ${Object.values(Placement).join(', ')}`);
    }

    const missing = REQUIRED_METHODS.filter(method => typeof this[method] !== 'function');
    if (missing.length) {
      throw new Error(`${name}: missing required method(s) ${missing.join(', ')}`);
    }

    this.type = type;
    this.questionTypes = questionTypes;
    this.placement = placement;
  }

  /**
   * Whether this descriptor handles the given interaction element. Defaults to matching the
   * element whose tag name is this interaction's type; interactions that can appear nested
   * in the item body (inline ones) override this.
   *
   * @param {Element} el
   * @returns {boolean}
   */
  matches(el) {
    return el.tagName.toLowerCase() === this.type;
  }

  /**
   * Options this interaction contributes to the question type selector. An interaction that
   * authors are not meant to pick directly contributes none.
   *
   * @returns {Array<{ value: string, label: string, description: string }>}
   */
  getTypeOptions() {
    return [];
  }
}
