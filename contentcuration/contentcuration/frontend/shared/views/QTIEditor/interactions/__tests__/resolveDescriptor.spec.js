import { parseItem } from '../../serialization/parseItem';
import { QtiInteraction, ValidationError } from '../../constants';
import { isSupportedItem, resolveDescriptor } from '../resolveDescriptor';
import {
  CHOICE_SINGLE_SELECT_XML,
  INLINE_CHOICE_ITEM_DOCUMENT,
  MATCH_THREE_SETS_XML,
  MULTI_INTERACTION_ITEM_DOCUMENT,
  MULTI_TEXT_ENTRY_ITEM_DOCUMENT,
  TWO_INTERACTIONS_DOCUMENT,
  UNDESCRIBED_INTERACTION,
  UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT,
  VALID_CHOICE_ITEM_DOCUMENT,
  VALID_MATCH_ITEM_DOCUMENT,
} from '../../utils/testingFixtures';

const UNDESCRIBED_XML = `<${UNDESCRIBED_INTERACTION} response-identifier="RESPONSE"/>`;

const interactionsOf = document => parseItem(document).interactions;

describe('resolveDescriptor', () => {
  it('resolves no descriptor for an interaction nothing is registered for', () => {
    expect(resolveDescriptor(UNDESCRIBED_XML, [])).toEqual({
      descriptor: null,
      questionType: null,
      error: null,
    });
  });

  it('resolves no descriptor for an empty body', () => {
    expect(resolveDescriptor('', []).descriptor).toBeNull();
  });

  it('resolves the descriptor of a recognized interaction', () => {
    const { descriptor, error } = resolveDescriptor(CHOICE_SINGLE_SELECT_XML, []);
    expect(descriptor.type).toBe(QtiInteraction.CHOICE);
    expect(error).toBeNull();
  });

  it('keeps the descriptor when its question type cannot be read', () => {
    const { descriptor, error } = resolveDescriptor(MATCH_THREE_SETS_XML, []);
    expect(descriptor.type).toBe(QtiInteraction.MATCH);
    expect(error).toBe(ValidationError.PARSE_ERROR);
  });

  it('resolves no descriptor for malformed XML', () => {
    expect(resolveDescriptor('<unclosed', [])).toMatchObject({
      descriptor: null,
      error: ValidationError.PARSE_ERROR,
    });
  });
});

describe('isSupportedItem', () => {
  it.each([
    ['no interactions', []],
    ['two choice interactions', interactionsOf(MULTI_INTERACTION_ITEM_DOCUMENT)],
    ['a choice and a text entry', interactionsOf(TWO_INTERACTIONS_DOCUMENT)],
    ['an interaction with no descriptor', interactionsOf(UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT)],
    ['an interaction with no editor', interactionsOf(INLINE_CHOICE_ITEM_DOCUMENT)],
    ['several text entries in one body', interactionsOf(MULTI_TEXT_ENTRY_ITEM_DOCUMENT)],
    [
      'an interaction whose question type cannot be read',
      [{ bodyXml: MATCH_THREE_SETS_XML, responseDeclarations: [] }],
    ],
  ])('rejects %s', (_, interactions) => {
    expect(isSupportedItem(interactions)).toBe(false);
  });

  it.each([
    ['one choice interaction', VALID_CHOICE_ITEM_DOCUMENT],
    ['a match interaction', VALID_MATCH_ITEM_DOCUMENT],
  ])('accepts %s', (_, document) => {
    expect(isSupportedItem(interactionsOf(document))).toBe(true);
  });
});
