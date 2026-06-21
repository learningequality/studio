/**
 * QTIDeclaration — authoring-side structural model of a QTI declaration element.
 *
 * Reads identifier, base-type, cardinality and capability children (correctResponse,
 * defaultValue, mapping, areaMapping) from XML, holds them as plain JS data,
 * and serializes back to XML on demand. Carries no runtime value state or scoring logic.
 *
 */
import { buildXmlNode } from '../assembleItem.js';
import { declarationParsers, CAPABILITY } from './declarations/index.js';
import { getSchemaForType } from './interactionSchema.js';
import CorrectResponse from './declarations/correctResponse.js';
import Mapping from './declarations/mapping.js';
import AreaMapping from './declarations/areaMapping.js';

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

  /** @type {string[]|null} */
  get correctResponse() {
    return this._capabilities[CAPABILITY.CORRECT_RESPONSE]?.get() ?? null;
  }

  /** @type {string[]|null} */
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
   * Reads base-type and cardinality from the interaction schema.
   *
   * @param {string} questionType - One of QuestionType.* (must exist in INTERACTION_SCHEMA)
   * @param {string} [identifier] - Response identifier, defaults to 'RESPONSE'
   * @returns {QTIDeclaration}
   */
  static forType(questionType, identifier = 'RESPONSE') {
    const schema = getSchemaForType(questionType);
    if (!schema) throw new Error(`Unknown question type: ${questionType}`);
    return new QTIDeclaration({
      identifier,
      baseType: schema.baseType,
      cardinality: schema.cardinality,
      tag: 'qti-response-declaration',
    });
  }

  /**
   * Convert this declaration to match a different question type.
   * Returns a new QTIDeclaration — this instance is never mutated.
   *
   * Conversion rules:
   *   - Same base-type: correctResponse values are migrated with cardinality
   *     rules applied (wrap on upgrade, truncate on downgrade). Mapping is
   *     carried forward when the target schema supports it.
   *   - Different base-type: correctResponse and mapping are dropped (the
   *     stored keys/values would be invalid for the new type).
   *   - defaultValue is always dropped (type-specific, unlikely to remain valid).
   *
   * @param {string}  newQuestionType - Target QuestionType.*
   * @param {object}  [opts]
   * @param {boolean} [opts.keepFirst=true] - On multiple/ordered→single downgrade,
   *   retain the first value instead of dropping all.
   * @returns {QTIDeclaration}
   */
  convertTo(newQuestionType, { keepFirst = true } = {}) {
    const schema = getSchemaForType(newQuestionType);
    if (!schema) throw new Error(`Unknown question type: ${newQuestionType}`);

    const newDecl = new QTIDeclaration({
      identifier: this.identifier,
      baseType: schema.baseType,
      cardinality: schema.cardinality,
      tag: this.tag,
    });

    const baseTypeChanged = schema.baseType !== this.baseType;

    const currentCR = this.correctResponse;
    if (
      currentCR !== null &&
      !baseTypeChanged &&
      schema.capabilities.includes(CAPABILITY.CORRECT_RESPONSE)
    ) {
      const migrated = migrateValues(currentCR, this.cardinality, schema.cardinality, keepFirst);
      if (migrated.length > 0) {
        CorrectResponse.fromPlain(migrated, newDecl);
      }
    }

    const currentMapping = this.mapping;
    if (
      currentMapping !== null &&
      !baseTypeChanged &&
      schema.capabilities.includes(CAPABILITY.MAPPING)
    ) {
      Mapping.fromPlain(currentMapping, newDecl);
    }

    const currentAreaMapping = this.areaMapping;
    if (
      currentAreaMapping !== null &&
      !baseTypeChanged &&
      schema.capabilities.includes(CAPABILITY.AREA_MAPPING)
    ) {
      AreaMapping.fromPlain(currentAreaMapping, newDecl);
    }

    return newDecl;
  }
}

// ---------------------------------------------------------------------------
// Module-private helpers
// ---------------------------------------------------------------------------

/**
 * Migrate correctResponse values across a cardinality change.
 *
 * @param {string[]} values    - Current values
 * @param {string}   fromCard  - Source cardinality
 * @param {string}   toCard    - Target cardinality
 * @param {boolean}  keepFirst - On downgrade to single, keep the first value
 * @returns {string[]}
 */
function migrateValues(values, fromCard, toCard, keepFirst) {
  const arr = Array.isArray(values) ? values : [values];

  if (toCard === 'single') {
    return keepFirst && arr.length > 0 ? [arr[0]] : [];
  }

  // single → multiple/ordered, or multiple ↔ ordered: values transfer unchanged.
  return arr;
}
