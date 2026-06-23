/**
 * AreaMapping declaration strategy.
 *
 * Parses a <qti-area-mapping> element into plain JS data for authoring round-trip.
 * The coords attribute is stored as an opaque string to prevent floating-point
 * formatting changes on re-serialization. Geometry evaluation is out of scope
 * for the authoring editor.
 */
import { buildXmlNode } from '../../assembleItem.js';
import { CAPABILITY } from './capabilities.js';
import { parseScoringAttrs } from './mapping.js';

export default class AreaMapping {
  /**
   * @param {{
   *   defaultValue: number,
   *   lowerBound: number|null,
   *   upperBound: number|null,
   *   entries: Array<{ shape: string, coords: string, mappedValue: number }>
   * }} data
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   */
  constructor(data, declaration) {
    this._data = data;
    this._declaration = declaration;
    declaration.registerCapability(CAPABILITY.AREA_MAPPING, this);
  }

  /**
   * Parse a <qti-area-mapping> element and register on the parent declaration.
   *
   * @param {Element} xmlNode
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   * @returns {AreaMapping}
   */
  static fromXML(xmlNode, declaration) {
    const bounds = parseScoringAttrs(xmlNode);

    const entries = [...xmlNode.querySelectorAll('qti-area-map-entry')].map(entry => ({
      shape: entry.getAttribute('shape'),
      coords: entry.getAttribute('coords'),
      mappedValue: parseFloat(entry.getAttribute('mapped-value')),
    }));

    return new AreaMapping({ ...bounds, entries }, declaration);
  }

  /**
   * @returns {{ defaultValue: number, lowerBound: number|null,
   *             upperBound: number|null, entries: Array }}
   */
  get() {
    return this._data;
  }

  /**
   * @returns {Element}
   */
  getXML() {
    const { defaultValue, lowerBound, upperBound, entries } = this._data;

    const attrs = { 'default-value': defaultValue };
    if (lowerBound !== null) attrs['lower-bound'] = lowerBound;
    if (upperBound !== null) attrs['upper-bound'] = upperBound;

    const children = entries.map(entry =>
      buildXmlNode({
        tag: 'qti-area-map-entry',
        attrs: {
          shape: entry.shape,
          coords: entry.coords,
          'mapped-value': entry.mappedValue,
        },
      }),
    );

    return buildXmlNode({ tag: 'qti-area-mapping', attrs, children });
  }
}
