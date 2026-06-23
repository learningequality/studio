/**
 * Declaration strategy registry for QTI child element parsing.
 *
 * Maps XML child tag names to their strategy classes. Each class exposes a
 * static fromXML(xmlNode, declaration) that parses the element and registers
 * a capability on the parent QTIDeclaration as a side-effect — identical to
 * the strategy-class pattern in Kolibri's declarationParsers.
 *
 * qti-interpolation-table, qti-match-table, and ruleHandlers are intentionally
 * omitted — the authoring editor has no lookup-table or response-processing support.
 */
import CorrectResponse from './correctResponse.js';
import DefaultValue from './defaultValue.js';
import Mapping from './mapping.js';
import AreaMapping from './areaMapping.js';

export { CAPABILITY } from './capabilities.js';

/**
 * Maps QTI child element tag names to declaration strategy classes.
 * QTIDeclaration.fromXML iterates child elements and delegates to these.
 *
 * @type {Object.<string,
 *   { fromXML: function(Element, import('../QTIDeclaration.js').QTIDeclaration): * }>}
 */
export const declarationParsers = {
  'qti-correct-response': CorrectResponse,
  'qti-default-value': DefaultValue,
  'qti-mapping': Mapping,
  'qti-area-mapping': AreaMapping,
};
