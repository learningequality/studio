export const Cardinality = Object.freeze({
  SINGLE: 'single',
  MULTIPLE: 'multiple',
  ORDERED: 'ordered',
  RECORD: 'record',
});

export const BaseType = Object.freeze({
  IDENTIFIER: 'identifier',
  BOOLEAN: 'boolean',
  INTEGER: 'integer',
  FLOAT: 'float',
  STRING: 'string',
  POINT: 'point',
  PAIR: 'pair',
  DIRECTED_PAIR: 'directedPair',
  DURATION: 'duration',
  FILE: 'file',
  URI: 'uri',
});

/**
 * QTI 3.0 interaction type identifiers.
 * Values are the actual XML element tag names used in QTI 3.0 documents,
 * so they serve as both type keys and CSS selectors for querySelectorAll.
 */
export const QtiInteraction = Object.freeze({
  CHOICE: 'qti-choice-interaction',
  ORDER: 'qti-order-interaction',
  MATCH: 'qti-match-interaction',
  TEXT_ENTRY: 'qti-text-entry-interaction',
  EXTENDED_TEXT: 'qti-extended-text-interaction',
});

/**
 * Selector-ready list of all known QTI interaction element tag names.
 * Derived directly from QtiInteraction so there is a single source of truth.
 */
export const QTI_INTERACTION_TAGS = Object.freeze(Object.values(QtiInteraction));
