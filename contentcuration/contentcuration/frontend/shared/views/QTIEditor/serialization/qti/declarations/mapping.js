/**
 * Mapping declaration strategy.
 *
 * Parses a <qti-mapping> element into plain JS data for authoring round-trip.
 * Registers a MAPPING capability so the data is accessible and re-serializable.
 *
 * Scoring logic (score(), clampScore(), lookup()) and the ScoringDeclaration
 * base class from the Kolibri original are intentionally omitted — the
 * authoring editor does not evaluate responses at runtime.
 */
import { buildXmlNode } from '../../assembleItem.js';
import { CAPABILITY } from './capabilities.js';

/**
 * Parse the bound attributes shared by Mapping and AreaMapping.
 *
 * @param {Element} xmlNode
 * @returns {{ defaultValue: number, lowerBound: number|null, upperBound: number|null }}
 */
export function parseScoringAttrs(xmlNode) {
  const parsed = parseFloat(xmlNode.getAttribute('default-value'));
  const defaultValue = isNaN(parsed) ? 0 : parsed;

  const lb = xmlNode.hasAttribute('lower-bound')
    ? parseFloat(xmlNode.getAttribute('lower-bound'))
    : NaN;
  const lowerBound = isNaN(lb) ? null : lb;

  const ub = xmlNode.hasAttribute('upper-bound')
    ? parseFloat(xmlNode.getAttribute('upper-bound'))
    : NaN;
  const upperBound = isNaN(ub) ? null : ub;

  return { defaultValue, lowerBound, upperBound };
}

export default class Mapping {
  /**
   * @param {{
   *   defaultValue: number,
   *   lowerBound: number|null,
   *   upperBound: number|null,
   *   entries: Array<{ mapKey: string|number|boolean, mappedValue: number,
   *                    caseSensitive: boolean }>
   * }} data
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   */
  constructor(data, declaration) {
    this._data = data;
    this._declaration = declaration;
    declaration.registerCapability(CAPABILITY.MAPPING, this);
  }

  /**
   * Parse a <qti-mapping> element and register on the parent declaration.
   *
   * @param {Element} xmlNode
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   * @returns {Mapping}
   */
  static fromXML(xmlNode, declaration) {
    const bounds = parseScoringAttrs(xmlNode);

    const entries = [...xmlNode.querySelectorAll('qti-map-entry')].map(entry => ({
      mapKey: declaration.coerceValue(entry.getAttribute('map-key')),
      mappedValue: parseFloat(entry.getAttribute('mapped-value')),
      // Per QTI spec, case-sensitive defaults to true; only false when explicitly set.
      caseSensitive: entry.getAttribute('case-sensitive') !== 'false',
    }));

    return new Mapping({ ...bounds, entries }, declaration);
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

    const children = entries.map(entry => {
      const entryAttrs = {
        'map-key': this._declaration.formatValue(entry.mapKey),
        'mapped-value': entry.mappedValue,
      };
      // Omit case-sensitive when true — it is the spec default.
      if (!entry.caseSensitive) entryAttrs['case-sensitive'] = 'false';
      return buildXmlNode({ tag: 'qti-map-entry', attrs: entryAttrs });
    });

    return buildXmlNode({ tag: 'qti-mapping', attrs, children });
  }
}
