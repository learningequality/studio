/**
 * Mapping declaration strategy.
 *
 * Parses a <qti-mapping> element into plain JS data for authoring round-trip.
 * Registers a MAPPING capability so the data is accessible and re-serializable.
 *
 * Scoring logic (score(), clampScore(), lookup()) and the ScoringDeclaration
 * base class from the Kolibri original are intentionally omitted — the
 * authoring editor does not evaluate responses at runtime.
 *
 * @module declarations/mapping
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
   *   entries: Array<{ mapKey: string, mappedValue: number, caseSensitive: boolean }>
   * }} data
   */
  constructor(data) {
    this._data = data;
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
      mapKey: entry.getAttribute('map-key'),
      mappedValue: parseFloat(entry.getAttribute('mapped-value')),
      // Per QTI spec, case-sensitive defaults to true; only false when explicitly set.
      caseSensitive: entry.getAttribute('case-sensitive') !== 'false',
    }));

    const instance = new Mapping({ ...bounds, entries });
    declaration.registerCapability(CAPABILITY.MAPPING, instance);
    return instance;
  }

  /**
   * Build from plain JS data and register on the parent declaration.
   * Used by QTIDeclaration.convertTo() when base-type is unchanged across a type conversion.
   *
   * @param {{ defaultValue: number, lowerBound: number|null,
   *            upperBound: number|null, entries: Array }} data
   * @param {import('../QTIDeclaration.js').QTIDeclaration} declaration
   * @returns {Mapping}
   */
  static fromPlain(data, declaration) {
    const instance = new Mapping(data);
    declaration.registerCapability(CAPABILITY.MAPPING, instance);
    return instance;
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
        'map-key': entry.mapKey,
        'mapped-value': entry.mappedValue,
      };
      // Omit case-sensitive when true — it is the spec default.
      if (!entry.caseSensitive) entryAttrs['case-sensitive'] = 'false';
      return buildXmlNode({ tag: 'qti-map-entry', attrs: entryAttrs });
    });

    return buildXmlNode({ tag: 'qti-mapping', attrs, children });
  }
}
