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

/**
 * Base types whose single-cardinality values are represented as 2-element arrays
 * in JS (e.g., point [100, 200], pair ["A", "B"], directedPair ["A", "B"]).
 * Distinguished from container arrays (multiple/ordered cardinality, N elements).
 */
const COMPOUND_VALUE_TYPES = new Set([BaseType.POINT, BaseType.PAIR, BaseType.DIRECTED_PAIR]);

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
    cardinality = Cardinality.SINGLE,
    tag = 'qti-response-declaration',
  }) {
    const IDENTIFIER_RE = /^[\p{L}_][\p{L}\p{N}_.-]*$/u;
    if (!identifier || !IDENTIFIER_RE.test(identifier)) {
      throw new Error(
        `QTIDeclaration: invalid identifier "${identifier}". ` +
          `Must start with a letter or underscore and contain only word characters, hyphens, or dots.`,
      );
    }

    if (cardinality === Cardinality.RECORD) {
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
   * Called as a side-effect by declaration strategy classes during their constructors.
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
   * Whether this declaration's base-type uses a 2-element array as its
   * native JS representation (point, pair, directedPair).
   *
   * Useful for callers that need to distinguish compound values from containers.
   *
   * @returns {boolean}
   */
  get isCompoundType() {
    return COMPOUND_VALUE_TYPES.has(this.baseType);
  }

  /**
   * Coerce a single raw XML string value to its native JS type.
   *
   * Follows the Kolibri QTI implementation — each base-type maps to a
   * specific JS primitive or 2-element array (point/pair/directedPair).
   * Returns null for empty, null, undefined, or 'NULL' inputs.
   *
   * @param {string|null|undefined} raw  - Raw text from a <qti-value> element
   * @param {string|null}           baseType - One of BaseType.* constants
   * @returns {string|number|boolean|Array|null}
   * @throws {TypeError} If the raw value is structurally incompatible with baseType
   */
  static coerceValue(raw, baseType) {
    // QTI treats empty / null as NULL — see qti-is-null spec
    if (raw === null || raw === undefined || raw === '' || raw === 'NULL') {
      return null;
    }

    switch (baseType) {
      case BaseType.BOOLEAN:
        if (raw !== 'true' && raw !== 'false') {
          throw new TypeError(`QTIDeclaration: cannot coerce "${raw}" to boolean`);
        }
        return raw === 'true';

      case BaseType.INTEGER: {
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) {
          throw new TypeError(`QTIDeclaration: cannot coerce "${raw}" to integer`);
        }
        return n;
      }

      case BaseType.FLOAT: {
        const n = parseFloat(raw);
        if (Number.isNaN(n)) {
          throw new TypeError(`QTIDeclaration: cannot coerce "${raw}" to float`);
        }
        return n;
      }

      case BaseType.POINT: {
        const parts = Array.isArray(raw)
          ? raw.map(v => parseInt(v, 10))
          : raw
              .trim()
              .split(/\s+/)
              .map(v => parseInt(v, 10));
        if (parts.length !== 2 || parts.some(Number.isNaN)) {
          throw new TypeError(`QTIDeclaration: cannot coerce "${raw}" to point`);
        }
        return parts;
      }

      case BaseType.PAIR:
      case BaseType.DIRECTED_PAIR: {
        const parts = Array.isArray(raw) ? raw.map(String) : raw.trim().split(/\s+/);
        if (parts.length !== 2) {
          throw new TypeError(`QTIDeclaration: cannot coerce "${raw}" to ${baseType}`);
        }
        return parts;
      }

      case BaseType.DURATION: {
        const n = parseFloat(raw);
        if (Number.isNaN(n) || n < 0) {
          throw new TypeError(`QTIDeclaration: cannot coerce "${raw}" to duration`);
        }
        return n;
      }

      case BaseType.STRING:
      case BaseType.IDENTIFIER:
      case BaseType.URI:
        if (typeof raw !== 'string') {
          throw new TypeError(`QTIDeclaration: cannot coerce "${raw}" to ${baseType}`);
        }
        return raw;

      case BaseType.FILE:
        // In the authoring editor, files are stored as raw strings (e.g. base64/URI).
        return raw;

      default:
        return raw;
    }
  }

  /**
   * Format a native JS value back to its QTI XML string representation.
   *
   * This is the inverse of coerceValue — safe to call on any JS primitive.
   * Compound types (point, pair, directedPair) stored as 2-element arrays
   * are joined with a space, matching the QTI XML format (e.g. "100 200").
   *
   * @param {string|number|boolean|Array|null} value
   * @returns {string}
   */
  static formatValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return value.join(' '); // point / pair / directedPair
    return String(value);
  }

  /**
   * Coerce a raw XML string value to its native JS type based on this declaration's baseType.
   *
   * @param {string|null|undefined} raw
   * @returns {string|number|boolean|Array|null}
   */
  coerceValue(raw) {
    return QTIDeclaration.coerceValue(raw, this.baseType);
  }

  /**
   * Format a native JS value back to its QTI XML string representation.
   *
   * @param {string|number|boolean|Array|null} value
   * @returns {string}
   */
  formatValue(value) {
    return QTIDeclaration.formatValue(value);
  }

  /**
   * Coerce an array of raw XML strings using this declaration's baseType.
   *
   * @param {string[]} rawStrings
   * @returns {Array<string|number|boolean|Array|null>}
   */
  coerceValues(rawStrings) {
    return rawStrings.map(v => this.coerceValue(v));
  }

  /**
   * Format an array of native JS values to QTI XML strings.
   *
   * @param {Array<string|number|boolean|Array|null>} values
   * @returns {string[]}
   */
  formatValues(values) {
    return values.map(v => this.formatValue(v));
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
    const cardinality = xmlNode.getAttribute('cardinality') ?? Cardinality.SINGLE;
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
