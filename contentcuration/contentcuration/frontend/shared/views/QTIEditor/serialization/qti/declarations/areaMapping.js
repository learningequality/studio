/**
 * AreaMapping declaration strategy.
 *
 * Parses a <qti-area-mapping> element into plain JS data for authoring round-trip.
 * The coords attribute is stored as an opaque string to prevent floating-point
 * formatting changes on re-serialization. Geometry evaluation is out of scope
 * for the authoring editor.
 */
import { buildXmlNode } from '../../xml.js';
import { ResponseProcessingTemplate } from '../../../constants.js';
import { CAPABILITY } from './capabilities.js';
import { buildAddToOutcomeNode } from './scoring.js';
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

  /**
   * Adds the response's mapped value to the outcome. Averaging these over an item assumes
   * each response scores at most 1.0; no interaction in this editor writes an area mapping
   * yet, so one that does should keep its mapped values (or its upper-bound) within that.
   *
   * @param {string} outcomeIdentifier - The outcome this response's score is added to
   * @returns {Element|null} null when there are no entries to map the response by
   */
  getScoringRule(outcomeIdentifier) {
    if (!this._data.entries.length) {
      return null;
    }
    return buildAddToOutcomeNode(
      outcomeIdentifier,
      buildXmlNode({
        tag: 'qti-map-response-point',
        attrs: { identifier: this._declaration.identifier },
      }),
    );
  }

  /**
   * @returns {string|null} map_response_point, or null when there are no entries to map
   *   the response by
   */
  getResponseProcessingTemplate() {
    return this._data.entries.length ? ResponseProcessingTemplate.MAP_RESPONSE_POINT : null;
  }
}
