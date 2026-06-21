/**
 * CorrectResponse declaration strategy.
 *
 * Parses a <qti-correct-response> element into an array of raw trimmed strings
 * and re-serializes it on demand. Values are kept as strings because the
 * authoring editor has no runtime value state and performs no type coercion.
 *
 * @module declarations/correctResponse
 */
import { buildXmlNode } from '../../assembleItem.js';
import { CAPABILITY } from './capabilities.js';

export default class CorrectResponse {
  /** @param {string[]} values - Correct response values as raw strings */
  constructor(values) {
    /** @type {string[]} */
    this._values = values;
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
    const values = [...xmlNode.querySelectorAll('qti-value')].map(v => v.textContent.trim());
    const instance = new CorrectResponse(values);
    declaration.registerCapability(CAPABILITY.CORRECT_RESPONSE, instance);
    return instance;
  }

  /**
   * Build from plain JS data and register on the parent declaration.
   * Used by QTIDeclaration.convertTo() to carry forward values without XML serialization.
   *
   * @param {string[]} values
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   * @returns {CorrectResponse}
   */
  static fromPlain(values, declaration) {
    const instance = new CorrectResponse(values);
    declaration.registerCapability(CAPABILITY.CORRECT_RESPONSE, instance);
    return instance;
  }

  /**
   * @returns {string[]}
   */
  get() {
    return this._values;
  }

  /**
   * @returns {Element}
   */
  getXML() {
    return buildXmlNode({
      tag: 'qti-correct-response',
      children: this._values.map(v => buildXmlNode({ tag: 'qti-value', children: [v] })),
    });
  }
}
