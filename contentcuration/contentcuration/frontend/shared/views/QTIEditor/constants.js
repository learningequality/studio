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
 * There are three distinct type concepts used within the QTI architecture:
 *
 * 1. AssessmentItemType (AssessmentItemTypes) -> The type stored in the database.
 *    Values representing how the backend and legacy code interpret items. For
 *    all QTI 3.0 items, this will be AssessmentItemTypes.QTI.
 *
 * 2. QuestionType -> The type editors will select per assessment item.
 *    It's different from AssessmentItemType because we will extend this for all
 *    new question types without confusing it with values stored in the database
 *    (all of these will be assessment item type: "qti"). Value is related to how
 *    Studio presents different question options to users in the UI.
 *
 * 3. InteractionType (QtiInteraction) -> The actual interactions defined by QTI,
 *    and the ones that dictate how to parse and what descriptor we will use.
 *    Each QTI interaction can have multiple related question types (e.g., choice
 *    can be singleSelect or multiSelect), but all of them will have assessment
 *    item type "qti".
 */

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

export const QTI_INTERACTION_TAGS = Object.freeze(Object.values(QtiInteraction));

export const AssessmentItemTypes = Object.freeze({
  SINGLE_SELECTION: 'single_selection',
  MULTIPLE_SELECTION: 'multiple_selection',
  TRUE_FALSE: 'true_false',
  INPUT_QUESTION: 'input_question',
  PERSEUS_QUESTION: 'perseus_question',
  FREE_RESPONSE: 'free_response',
  QTI: 'qti',
});

export const QuestionType = Object.freeze({
  SINGLE_SELECT: 'single_selection',
  MULTI_SELECT: 'multiple_selection',
});
