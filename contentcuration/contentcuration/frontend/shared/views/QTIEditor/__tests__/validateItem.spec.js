import { validateItemShape, validateQtiItem } from '../validateItem';
import { QuestionType, ValidationError } from '../constants';
import {
  VALID_CHOICE_ITEM_DOCUMENT,
  CHOICE_ITEM_DOCUMENT_NO_PROMPT,
  CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER,
  NO_INTERACTION_ITEM_DOCUMENT,
  INLINE_CHOICE_ITEM_DOCUMENT,
  VALID_MATCH_ITEM_DOCUMENT,
  MATCH_THREE_SETS_XML,
  MATCH_XML,
  MULTI_TEXT_ENTRY_ITEM_DOCUMENT,
  MULTI_INTERACTION_ITEM_DOCUMENT,
  UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT,
} from '../utils/testingFixtures';

const codesOf = errors => errors.map(error => error.code);

describe('validateQtiItem', () => {
  it('returns no errors for a complete item', () => {
    expect(validateQtiItem(VALID_CHOICE_ITEM_DOCUMENT)).toEqual([]);
  });

  it('reports a missing prompt', () => {
    expect(codesOf(validateQtiItem(CHOICE_ITEM_DOCUMENT_NO_PROMPT))).toContain(
      ValidationError.PROMPT_REQUIRED,
    );
  });

  it('reports a missing correct answer', () => {
    expect(codesOf(validateQtiItem(CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER))).toContain(
      ValidationError.NO_CORRECT_ANSWER,
    );
  });

  it('does not apply editor rules to an item with several text entries', () => {
    const xml = MULTI_TEXT_ENTRY_ITEM_DOCUMENT.replace(/>Sun</, '><').replace(/>Moon</, '><');
    expect(validateQtiItem(xml)).toEqual([]);
  });

  it('reports an item whose body holds no interaction', () => {
    expect(validateQtiItem(NO_INTERACTION_ITEM_DOCUMENT)).toEqual([
      { code: ValidationError.NO_INTERACTION },
    ]);
  });

  it('reports nothing for an item with an interaction with no descriptor, which is shown read-only', () => {
    expect(validateQtiItem(UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT)).toEqual([]);
    expect(
      validateQtiItem(UNRECOGNIZED_INTERACTION_ITEM_DOCUMENT, { allowFreeResponse: false }),
    ).toEqual([]);
  });

  it('reports a three-set match interaction inside a multi-interaction item as unparseable', () => {
    const xml = MULTI_INTERACTION_ITEM_DOCUMENT.replace(
      /<qti-choice-interaction response-identifier="RESP2"[\s\S]*?<\/qti-choice-interaction>/,
      MATCH_THREE_SETS_XML,
    );
    expect(codesOf(validateQtiItem(xml))).toContain(ValidationError.PARSE_ERROR);
  });

  it('does not apply the editor rules to a multi-interaction item', () => {
    const xml = MULTI_INTERACTION_ITEM_DOCUMENT.replace(
      /<qti-prompt>First question<\/qti-prompt>/,
      '',
    );
    expect(validateQtiItem(xml, { allowFreeResponse: false })).toEqual([]);
  });

  it('does not apply the editor rules to an interaction with no editor', () => {
    expect(validateQtiItem(INLINE_CHOICE_ITEM_DOCUMENT)).toEqual([]);
  });

  it('reports an item with no raw data at all', () => {
    expect(validateQtiItem('')).toEqual([{ code: ValidationError.NO_INTERACTION }]);
    expect(validateQtiItem(undefined)).toEqual([{ code: ValidationError.NO_INTERACTION }]);
  });

  describe('match interaction', () => {
    it('returns no errors for a complete match item', () => {
      expect(validateQtiItem(VALID_MATCH_ITEM_DOCUMENT)).toEqual([]);
    });

    it('runs the match validator', () => {
      const noPrompt = VALID_MATCH_ITEM_DOCUMENT.replace(/<qti-prompt>.*<\/qti-prompt>/, '');
      expect(codesOf(validateQtiItem(noPrompt))).toContain(ValidationError.PROMPT_REQUIRED);
    });

    it('reports a match interaction without exactly two match sets as unparseable', () => {
      const threeSets = VALID_MATCH_ITEM_DOCUMENT.replace(MATCH_XML, MATCH_THREE_SETS_XML);
      expect(validateQtiItem(threeSets)).toEqual([{ code: ValidationError.PARSE_ERROR }]);
    });
  });

  it('reports unparseable XML', () => {
    expect(validateQtiItem('<qti-assessment-item><oops>')).toEqual([
      { code: ValidationError.PARSE_ERROR },
    ]);
  });
});

// What the editor asks about an item it is already showing, which is everything an
// interaction cannot answer for itself.
describe('validateItemShape', () => {
  it('accepts an item with something to answer', () => {
    expect(
      validateItemShape({ interactions: [{}], questionTypes: [QuestionType.SINGLE_SELECT] }),
    ).toEqual([]);
  });

  it('reports an item with nothing to answer', () => {
    expect(validateItemShape({ interactions: [] })).toEqual([
      { code: ValidationError.NO_INTERACTION },
    ]);
  });

  it('accepts a free-response question when the consumer allows it', () => {
    expect(
      validateItemShape({
        interactions: [{}],
        questionTypes: [QuestionType.FREE_RESPONSE],
        allowFreeResponse: true,
      }),
    ).toEqual([]);
  });

  it('reports a free-response question when the consumer scores its questions', () => {
    expect(
      validateItemShape({
        interactions: [{}],
        questionTypes: [QuestionType.FREE_RESPONSE],
        allowFreeResponse: false,
      }),
    ).toEqual([{ code: ValidationError.FREE_RESPONSE_NOT_ALLOWED }]);
  });
});
