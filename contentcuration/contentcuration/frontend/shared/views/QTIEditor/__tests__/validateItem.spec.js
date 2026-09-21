import { validateItemShape, validateQtiItem } from '../validateItem';
import { QuestionType, ValidationError } from '../constants';
import {
  VALID_CHOICE_ITEM_DOCUMENT,
  CHOICE_ITEM_DOCUMENT_NO_PROMPT,
  CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER,
  NO_INTERACTION_ITEM_DOCUMENT,
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

  it('reports an item whose body holds no interaction', () => {
    expect(validateQtiItem(NO_INTERACTION_ITEM_DOCUMENT)).toEqual([
      { code: ValidationError.NO_INTERACTION },
    ]);
  });

  it('reports an item with no raw data at all', () => {
    expect(validateQtiItem('')).toEqual([{ code: ValidationError.NO_INTERACTION }]);
    expect(validateQtiItem(undefined)).toEqual([{ code: ValidationError.NO_INTERACTION }]);
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
