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

export const QtiInteraction = Object.freeze({
  CHOICE: 'choiceInteraction',
  ORDER: 'orderInteraction',
  MATCH: 'matchInteraction',
  TEXT_ENTRY: 'textEntryInteraction',
  EXTENDED_TEXT: 'extendedTextInteraction',
});
