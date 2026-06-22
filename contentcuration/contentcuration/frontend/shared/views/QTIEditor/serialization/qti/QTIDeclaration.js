/**
 * QTIDeclaration — authoring-side structural model of a QTI declaration element.
 *
 * Reads identifier, base-type, cardinality and capability children (correctResponse,
 * defaultValue, mapping, areaMapping) from XML, holds them as plain JS data with
 * native JS types (number, boolean, string) based on the declaration's base-type,
 * and serializes back to XML on demand. Carries no runtime value state or scoring logic.
 *
 */
import { buildXmlNode } from '../assembleItem.js';
import { getDescriptorForQuestionType } from '../../interactions/index.js';
import { BaseType, Cardinality } from '../../constants.js';
import { declarationParsers, CAPABILITY } from './declarations/index.js';

export class QTIDeclaration {
  /**
   * @param {object}      options
   * @param {string}      options.identifier   - The QTI identifier attribute
   * @param {string|null} [options.baseType]   - The QTI base-type attribute (null when absent)
   * @param {string}      [options.cardinality] - 'single' | 'multiple' | 'ordered' | 'record'
   * @param {string}      [options.tag]        - Element tag name used when serializing
   */
  constructor({
    identifier,
    baseType = null,
    cardinality = 'single',
    tag = 'qti-response-declaration',
  }) {
    const IDENTIFIER_RE = /^[\p{L}_][\p{L}\p{N}_.-]*$/u;
    if (!identifier || !IDENTIFIER_RE.test(identifier)) {
      throw new Error(
        `QTIDeclaration: invalid identifier "${identifier}". ` +
          `Must start with a letter or underscore and contain only word characters, hyphens, or dots.`,
      );
    }

    if (cardinality === 'record') {
      throw new Error('cardinality="record" is not yet supported');
    }

    const validCardinalities = new Set(
      Object.values(Cardinality).filter(c => c !== Cardinality.RECORD),
    );
    if (!validCardinalities.has(cardinality)) {
      throw new Error(
        `QTIDeclaration: invalid cardinality "${cardinality}". ` +
          `Must be one of: ${[...validCardinalities].join(', ')}.`,
      );
    }

    if (baseType !== null && !Object.values(BaseType).includes(baseType)) {
      throw new Error(
        `QTIDeclaration: invalid base-type "${baseType}". ` +
          `Must be one of: ${Object.values(BaseType).join(', ')}.`,
      );
    }

    if (tag !== 'qti-response-declaration' && tag !== 'qti-outcome-declaration') {
      throw new Error(
        `QTIDeclaration: invalid tag "${tag}". ` +
          `Must be 'qti-response-declaration' or 'qti-outcome-declaration'.`,
      );
    }

    this.tag = tag;
    this.identifier = identifier;
    this.baseType = baseType;
    this.cardinality = cardinality;

    /** @type {Object.<string, { get(): *, getXML(): Element }>} */
    this._capabilities = {};
  }

  // ---------------------------------------------------------------------------
  // Capability registration
  // ---------------------------------------------------------------------------

  /**
   * Register a named capability on this declaration.
   * Called as a side-effect by declaration strategy classes during fromXML/fromPlain.
   *
   * @param {string} name - One of the CAPABILITY constants
   * @param {{ get(): *, getXML(): Element }} declarationObject
   */
  registerCapability(name, declarationObject) {
    this._capabilities[name] = declarationObject;
  }

  // ---------------------------------------------------------------------------
  // Convenience getters
  // ---------------------------------------------------------------------------

  /** @type {Array<string|number|boolean>|null} */
  get correctResponse() {
    return this._capabilities[CAPABILITY.CORRECT_RESPONSE]?.get() ?? null;
  }

  /** @type {Array<string|number|boolean>|null} */
  get defaultValue() {
    return this._capabilities[CAPABILITY.DEFAULT_VALUE]?.get() ?? null;
  }

  /** @type {object|null} */
  get mapping() {
    return this._capabilities[CAPABILITY.MAPPING]?.get() ?? null;
  }

  /** @type {object|null} */
  get areaMapping() {
    return this._capabilities[CAPABILITY.AREA_MAPPING]?.get() ?? null;
  }

  // ---------------------------------------------------------------------------
  // Value coercion and formatting
  // ---------------------------------------------------------------------------

  /**
   * Coerce a raw XML string value to its native JS type based on a QTI base-type.
   *
   * QTI stores all values as text nodes in XML. This method converts the raw
   * string to the appropriate JS primitive so the editor works with native types.
   *
   * @param {string} raw      - Raw text from a <qti-value> element
   * @param {string} baseType - One of BaseType.* (or null)
   * @returns {string|number|boolean}
   */
  static coerceValue(raw, baseType) {
    switch (baseType) {
      case BaseType.INTEGER: {
        const n = parseInt(raw, 10);
        return Number.isNaN(n) ? raw : n;
      }
      case BaseType.FLOAT: {
        const n = parseFloat(raw);
        return Number.isNaN(n) ? raw : n;
      }
      case BaseType.BOOLEAN:
        return raw === 'true';
      default:
        // identifier, string, point, pair, directedPair, duration, file, uri
        return raw;
    }
  }

  /**
   * Format a native JS value back to its QTI XML string representation.
   *
   * This is the inverse of coerceValue — safe to call on any JS primitive.
   *
   * @param {string|number|boolean} value
   * @returns {string}
   */
  static formatValue(value) {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value ?? '');
  }

  /**
   * Coerce an array of raw XML strings using this declaration's baseType.
   *
   * @param {string[]} rawStrings
   * @returns {Array<string|number|boolean>}
   */
  coerceValues(rawStrings) {
    return rawStrings.map(v => QTIDeclaration.coerceValue(v, this.baseType));
  }

  /**
   * Format an array of native JS values to QTI XML strings.
   *
   * @param {Array<string|number|boolean>} values
   * @returns {string[]}
   */
  formatValues(values) {
    return values.map(QTIDeclaration.formatValue);
  }

  // ---------------------------------------------------------------------------
  // XML entry point
  // ---------------------------------------------------------------------------

  /**
   * Build a QTIDeclaration from a QTI declaration XML element.
   *
   * Reads identifier / base-type / cardinality from attributes, then iterates
   * child elements and delegates each to the declarationParsers registry.
   * Each parser registers itself as a capability as a side-effect.
   *
   * @param {Element} xmlNode - e.g. <qti-response-declaration> or <qti-outcome-declaration>
   * @returns {QTIDeclaration}
   */
  static fromXML(xmlNode) {
    const identifier = xmlNode.getAttribute('identifier') ?? '';
    const baseType = xmlNode.getAttribute('base-type') ?? null;
    const cardinality = xmlNode.getAttribute('cardinality') ?? 'single';
    const tag = xmlNode.tagName.toLowerCase();

    const declaration = new QTIDeclaration({ identifier, baseType, cardinality, tag });

    for (const child of xmlNode.children) {
      const childTag = child.tagName.toLowerCase();
      const Decl = declarationParsers[childTag];
      if (Decl) {
        Decl.fromXML(child, declaration);
      }
    }

    return declaration;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize this declaration to an XML element, including all registered
   * capability child nodes.
   *
   * @returns {Element}
   */
  getXML() {
    const attrs = {
      identifier: this.identifier,
      cardinality: this.cardinality,
    };
    // base-type is omitted when null (e.g. some outcome declarations)
    if (this.baseType !== null) {
      attrs['base-type'] = this.baseType;
    }

    const children = Object.values(this._capabilities).map(cap => cap.getXML());

    return buildXmlNode({ tag: this.tag, attrs, children });
  }

  // ---------------------------------------------------------------------------
  // Type-schema factory and conversion
  // ---------------------------------------------------------------------------

  /**
   * Create a blank QTIDeclaration shaped for the given question type.
   * Delegates to the factory registered by each interaction module.
   *
   * @param {string} questionType - One of QuestionType.* (must have a registered factory)
   * @param {string} [identifier] - Response identifier, defaults to 'RESPONSE'
   * @param {*}      [itemData]   - Optional item data forwarded to the factory
   * @returns {QTIDeclaration}
   */
  static forType(questionType, identifier = 'RESPONSE', itemData = null) {
    const descriptor = getDescriptorForQuestionType(questionType);
    if (!descriptor) throw new Error(`Unknown question type: ${questionType}`);
    const schema = descriptor.getDeclarationSchema(questionType, itemData);
    return new QTIDeclaration({
      identifier,
      baseType: schema.baseType,
      cardinality: schema.cardinality,
      tag: 'qti-response-declaration',
    });
  }
}
