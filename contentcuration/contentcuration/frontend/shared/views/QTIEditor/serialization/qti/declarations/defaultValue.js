/**
 * DefaultValue declaration strategy.
 *
 * Parses a <qti-default-value> element and coerces each <qti-value> text
 * to its native JS type (number, boolean, or string) based on the parent
 * declaration's base-type. Re-serializes values back to XML strings on demand.
 */
import { buildXmlNode } from '../../assembleItem.js';
import { CAPABILITY } from './capabilities.js';

export default class DefaultValue {
  /**
   * @param {Array<string|number|boolean>} values   - Default values (native JS types)
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   */
  constructor(values, declaration) {
    /** @type {Array<string|number|boolean>} */
    this._values = values;
    this._declaration = declaration;
    declaration.registerCapability(CAPABILITY.DEFAULT_VALUE, this);
  }

  /**
   * Parse a <qti-default-value> element and register on the parent declaration.
   *
   * @param {Element} xmlNode
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   * @returns {DefaultValue}
   */
  static fromXML(xmlNode, declaration) {
    const rawStrings = [...xmlNode.querySelectorAll('qti-value')].map(v => v.textContent.trim());
    return new DefaultValue(declaration.coerceValues(rawStrings), declaration);
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
      tag: 'qti-default-value',
      children: this._declaration
        .formatValues(this._values)
        .map(v => buildXmlNode({ tag: 'qti-value', children: [v] })),
    });
  }
}
