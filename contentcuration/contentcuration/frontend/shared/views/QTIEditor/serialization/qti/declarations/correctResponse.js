/**
 * CorrectResponse declaration strategy.
 *
 * Parses a <qti-correct-response> element and coerces each <qti-value> text
 * to its native JS type (number, boolean, or string) based on the parent
 * declaration's base-type. Re-serializes values back to XML strings on demand.
 */
import { buildXmlNode } from '../../assembleItem.js';
import { CAPABILITY } from './capabilities.js';

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
   * @returns {Element}
   */
  getXML() {
    return buildXmlNode({
      tag: 'qti-correct-response',
      children: this._declaration
        .formatValues(this._values)
        .map(v => buildXmlNode({ tag: 'qti-value', children: [v] })),
    });
  }
}
