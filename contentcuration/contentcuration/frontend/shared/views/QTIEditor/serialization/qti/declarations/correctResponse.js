/**
 * CorrectResponse declaration strategy.
 *
 * Parses a <qti-correct-response> element and coerces each <qti-value> text
 * to its native JS type (number, boolean, or string) based on the parent
 * declaration's base-type. Re-serializes values back to XML strings on demand.
 */
import { buildFloatNode, buildXmlNode } from '../../xml.js';
import { ResponseProcessingTemplate } from '../../../constants.js';
import { CAPABILITY } from './capabilities.js';
import { buildAddToOutcomeNode } from './scoring.js';

export default class CorrectResponse {
  /**
   * @param {Array<string|number|boolean>} values   - Correct response values (native JS types)
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   */
  constructor(values, declaration) {
    /** @type {Array<string|number|boolean>} */
    this._values = values;
    this._declaration = declaration;
    declaration.registerCapability(CAPABILITY.CORRECT_RESPONSE, this);
  }

  /**
   * Parse a <qti-correct-response> element and register on the parent declaration.
   * Note: the optional `interpretation` attribute (QTI 3.0 §3.1.1.2) is not
   * preserved — it is not used by the authoring editor.
   *
   * @param {Element} xmlNode
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   * @returns {CorrectResponse}
   */
  static fromXML(xmlNode, declaration) {
    const rawStrings = [...xmlNode.querySelectorAll('qti-value')].map(v => v.textContent.trim());
    return new CorrectResponse(declaration.coerceValues(rawStrings), declaration);
  }

  /**
   * @returns {Array<string|number|boolean>}
   */
  get() {
    return this._values;
  }

  /**
   * `qti-correct-response` is optional but must hold at least one `qti-value` when
   * present, so an answer-less declaration omits the element rather than emitting an
   * empty one the schema would reject.
   *
   * @returns {Element|null}
   */
  getXML() {
    if (!this._values.length) {
      return null;
    }
    return buildXmlNode({
      tag: 'qti-correct-response',
      children: this._declaration
        .formatValues(this._values)
        .map(v => buildXmlNode({ tag: 'qti-value', children: [v] })),
    });
  }

  /**
   * Adds 1.0 to the outcome when the response matches, assuming the item's score is the
   * average of its correct responses. Another combination (weights, all-or-nothing) needs
   * this condition and its increment changed.
   *
   * @param {string} outcomeIdentifier - The outcome this response's score is added to
   * @returns {Element|null} null when there is no correct response to match against
   */
  getScoringRule(outcomeIdentifier) {
    if (!this._values.length) {
      return null;
    }
    const response = { identifier: this._declaration.identifier };
    return buildXmlNode({
      tag: 'qti-response-condition',
      children: [
        buildXmlNode({
          tag: 'qti-response-if',
          children: [
            buildXmlNode({
              tag: 'qti-match',
              children: [
                buildXmlNode({ tag: 'qti-variable', attrs: response }),
                buildXmlNode({ tag: 'qti-correct', attrs: response }),
              ],
            }),
            buildAddToOutcomeNode(outcomeIdentifier, buildFloatNode(1)),
          ],
        }),
      ],
    });
  }

  /**
   * @returns {string|null} match_correct, or null when there is no correct response to
   *   match against
   */
  getResponseProcessingTemplate() {
    return this._values.length ? ResponseProcessingTemplate.MATCH_CORRECT : null;
  }
}
