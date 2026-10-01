/**
 * Mapping declaration strategy.
 *
 * Parses a <qti-mapping> element into plain JS data for authoring round-trip.
 * Registers a MAPPING capability so the data is accessible and re-serializable.
 *
 * Scoring logic (score(), clampScore(), lookup()) and the ScoringDeclaration
 * base class from the Kolibri original are intentionally omitted — the
 * authoring editor does not evaluate responses at runtime. It only writes the
 * response-processing rule that has the delivery engine map them
 * (getScoringRule, getResponseProcessingTemplate).
 */
import { buildXmlNode, formatFloat } from '../../xml.js';
import { ResponseProcessingTemplate } from '../../../constants.js';
import { CAPABILITY } from './capabilities.js';
import { buildAddToOutcomeNode } from './scoring.js';

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
      // XSD default (MapEntryDType) is false; true only for xs:boolean's true forms.
      caseSensitive: ['true', '1'].includes(entry.getAttribute('case-sensitive')),
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

    const attrs = { 'default-value': formatFloat(defaultValue) };
    if (lowerBound !== null) attrs['lower-bound'] = formatFloat(lowerBound);
    if (upperBound !== null) attrs['upper-bound'] = formatFloat(upperBound);

    const children = entries.map(entry => {
      const entryAttrs = {
        'map-key': this._declaration.formatValue(entry.mapKey),
        'mapped-value': formatFloat(entry.mappedValue),
      };
      // Omit when false — the XSD default — so a consumer applying attribute defaults
      // reads back what was authored.
      if (entry.caseSensitive) entryAttrs['case-sensitive'] = 'true';
      return buildXmlNode({ tag: 'qti-map-entry', attrs: entryAttrs });
    });

    return buildXmlNode({ tag: 'qti-mapping', attrs, children });
  }

  /**
   * Adds the response's mapped value to the outcome. Averaging these over an item assumes
   * each response scores at most 1.0, which holds for the mappings this editor writes: text
   * entry maps each accepted answer to 1.
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
        tag: 'qti-map-response',
        attrs: { identifier: this._declaration.identifier },
      }),
    );
  }

  /**
   * @returns {string|null} map_response, or null when there are no entries to map
   *   the response by
   */
  getResponseProcessingTemplate() {
    return this._data.entries.length ? ResponseProcessingTemplate.MAP_RESPONSE : null;
  }
}
