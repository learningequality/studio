/**
 * DefaultValue declaration strategy.
 *
 * Parses a <qti-default-value> element into an array of raw trimmed strings
 * and re-serializes it on demand. Included for declaration round-trip fidelity;
 * the authoring editor does not evaluate or coerce default values at runtime.
 *
 * @module declarations/defaultValue
 */
import { buildXmlNode } from '../../assembleItem.js';
import { CAPABILITY } from './capabilities.js';

export default class DefaultValue {
  /** @param {string[]} values - Default values as raw strings */
  constructor(values) {
    /** @type {string[]} */
    this._values = values;
  }

  /**
   * Parse a <qti-default-value> element and register on the parent declaration.
   *
   * @param {Element} xmlNode
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   * @returns {DefaultValue}
   */
  static fromXML(xmlNode, declaration) {
    const values = [...xmlNode.querySelectorAll('qti-value')].map(v => v.textContent.trim());
    const instance = new DefaultValue(values);
    declaration.registerCapability(CAPABILITY.DEFAULT_VALUE, instance);
    return instance;
  }

  /**
   * Build from plain JS data and register on the parent declaration.
   *
   * @param {string[]} values
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   * @returns {DefaultValue}
   */
  static fromPlain(values, declaration) {
    const instance = new DefaultValue(values);
    declaration.registerCapability(CAPABILITY.DEFAULT_VALUE, instance);
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
      tag: 'qti-default-value',
      children: this._values.map(v => buildXmlNode({ tag: 'qti-value', children: [v] })),
    });
  }
}
