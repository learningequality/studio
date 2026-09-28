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

export const Orientation = Object.freeze({
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal',
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
 *    (all of these will be assessment item type: "QTI"). Value is related to how
 *    Studio presents different question options to users in the UI.
 *
 * 3. InteractionType (QtiInteraction) -> The actual interactions defined by QTI,
 *    and the ones that dictate how to parse and what descriptor we will use.
 *    Each QTI interaction can have multiple related question types (e.g., choice
 *    can be singleSelect or multiSelect), but all of them will have assessment
 *    item type "QTI".
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

/**
 * Assessment item types as stored in the database.
 * Within the QTI Editor, all authored items will have type QTI.
 * The other legacy values are kept here for reference but are handled
 * by the broader Studio assessment system, not by this editor.
 */
export const AssessmentItemTypes = Object.freeze({
  // Matches the value the API stores and returns (le_utils exercises.QTI).
  QTI: 'QTI',
});

/**
 * UI-facing question type values — what the type selector shows to authors.
 * These are distinct from AssessmentItemTypes (database) and QtiInteraction (XML tags).
 * One QtiInteraction can map to multiple QuestionTypes (e.g. choice → singleSelect | multiSelect).
 */
export const QuestionType = Object.freeze({
  SINGLE_SELECT: 'singleSelect',
  MULTI_SELECT: 'multiSelect',
  NUMERIC: 'numeric',
  TEXT_ENTRY: 'textEntry',
  FREE_RESPONSE: 'freeResponse',
  ORDERING: 'ordering',
});

/**
 * Error codes returned by each interaction's validate() function.
 * Interaction-agnostic codes live here; interaction-specific codes may extend
 * this set in their own validate.js module.
 */
export const ValidationError = Object.freeze({
  // Item-level codes, produced by validateItem.js rather than an interaction
  PARSE_ERROR: 'PARSE_ERROR',
  NO_INTERACTION: 'NO_INTERACTION',
  FREE_RESPONSE_NOT_ALLOWED: 'FREE_RESPONSE_NOT_ALLOWED',
  PROMPT_REQUIRED: 'PROMPT_REQUIRED',
  NO_CORRECT_ANSWER: 'NO_CORRECT_ANSWER',
  TOO_MANY_CORRECT_ANSWERS: 'TOO_MANY_CORRECT_ANSWERS',
  EMPTY_CHOICE_CONTENT: 'EMPTY_CHOICE_CONTENT',
  DUPLICATE_CHOICE_CONTENT: 'DUPLICATE_CHOICE_CONTENT',
  INVALID_NUMERIC_VALUE: 'INVALID_NUMERIC_VALUE',
  EMPTY_ANSWER_CONTENT: 'EMPTY_ANSWER_CONTENT',
  DUPLICATE_ANSWER_CONTENT: 'DUPLICATE_ANSWER_CONTENT',
  TOO_FEW_CHOICES: 'TOO_FEW_CHOICES',
});

export const RESPONSE_IDENTIFIER = 'RESPONSE';

export const Placement = Object.freeze({
  BLOCK: 'block',
  INLINE: 'inline',
});
