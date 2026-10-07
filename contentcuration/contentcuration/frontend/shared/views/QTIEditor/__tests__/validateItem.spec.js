import { validateItemShape, validateQtiItem } from '../validateItem';
import { QuestionType, ValidationError } from '../constants';
import { assembleItemXml } from '../serialization/assembleItem';
import { parseItem } from '../serialization/parseItem';
import { textEntryInteractionDescriptor } from '../interactions/textEntry/Descriptor';
import { validateTextEntryInteraction } from '../interactions/textEntry/validation';
import {
  VALID_CHOICE_ITEM_DOCUMENT,
  CHOICE_ITEM_DOCUMENT_NO_PROMPT,
  CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER,
  CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER_WITH_STIMULUS,
  NO_INTERACTION_ITEM_DOCUMENT,
  INLINE_CHOICE_ITEM_DOCUMENT,
  VALID_MATCH_ITEM_DOCUMENT,
  MATCH_THREE_SETS_XML,
  MATCH_XML,
  MULTI_TEXT_ENTRY_ITEM_DOCUMENT,
  TEXT_ENTRY_ITEM_DOCUMENT_SHARED_PARAGRAPH,
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

  it('does not apply editor rules to an item whose body the editor cannot reproduce', () => {
    const noPrompt = TEXT_ENTRY_ITEM_DOCUMENT_SHARED_PARAGRAPH.replace(
      '<p>Tell us what you think.</p>',
      '',
    );
    expect(validateQtiItem(CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER_WITH_STIMULUS)).toEqual([]);
    expect(validateQtiItem(noPrompt, { allowFreeResponse: false })).toEqual([]);
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

  describe('numeric answers', () => {
    const { INVALID_NUMERIC_VALUE, DUPLICATE_ANSWER_CONTENT } = ValidationError;

    it.each([
      ...['5', '-5', '+5', '5.', '.5', '1e-5', '1E5', '2.3e+10'].map(value => [[value], []]),
      ...[
        'e',
        '-',
        '+',
        '1e',
        '1e2e3',
        '1.2.3',
        '1,234',
        'INF',
        '-INF',
        'NaN',
        '1e400',
        '0x10',
        'Infinity',
        '',
      ].map(value => [[value], [INVALID_NUMERIC_VALUE]]),
      [
        ['21', '21.0'],
        [DUPLICATE_ANSWER_CONTENT, DUPLICATE_ANSWER_CONTENT],
      ],
      [
        ['5', '5'],
        [DUPLICATE_ANSWER_CONTENT, DUPLICATE_ANSWER_CONTENT],
      ],
      [
        ['e', 'e'],
        [
          INVALID_NUMERIC_VALUE,
          INVALID_NUMERIC_VALUE,
          DUPLICATE_ANSWER_CONTENT,
          DUPLICATE_ANSWER_CONTENT,
        ],
      ],
      [
        ['e', '-'],
        [INVALID_NUMERIC_VALUE, INVALID_NUMERIC_VALUE],
      ],
    ])('reports %j as %j, the same as the editor', (values, expected) => {
      const state = {
        prompt: '<p>Enter a number</p>',
        answers: values.map((value, i) => ({ id: `a${i}`, value, caseSensitive: false })),
        expectedLength: 0,
      };
      const { bodyXml, responseDeclarations } = textEntryInteractionDescriptor.buildXML(
        state,
        QuestionType.NUMERIC,
      );
      const xml = assembleItemXml({ identifier: 'item', title: '', bodyXml, responseDeclarations });

      expect(codesOf(validateTextEntryInteraction(state, QuestionType.NUMERIC))).toEqual(expected);
      expect(codesOf(validateQtiItem(xml))).toEqual(expected);
    });

    it('reports no correct answer past a non-numeric default value', () => {
      const { bodyXml } = textEntryInteractionDescriptor.buildXML(
        { prompt: '<p>Enter a number</p>', answers: [], expectedLength: 0 },
        QuestionType.NUMERIC,
      );
      const declaration =
        '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float">' +
        '<qti-default-value><qti-value>x</qti-value></qti-default-value>' +
        '<qti-correct-response><qti-value>5</qti-value></qti-correct-response>' +
        '</qti-response-declaration>';
      const xml = assembleItemXml({
        identifier: 'item',
        title: '',
        bodyXml,
        responseDeclarations: [declaration],
      });

      expect(codesOf(validateQtiItem(xml))).toEqual([ValidationError.NO_CORRECT_ANSWER]);
    });
  });

  describe('text entry answers', () => {
    it.each([false, true])('reopens and accepts NULL with caseSensitive %s', caseSensitive => {
      const { bodyXml, responseDeclarations } = textEntryInteractionDescriptor.buildXML(
        {
          prompt: '<p>Which SQL keyword marks a missing value?</p>',
          answers: [{ id: 'a0', value: 'NULL', caseSensitive }],
          expectedLength: 0,
        },
        QuestionType.TEXT_ENTRY,
      );
      const xml = assembleItemXml({ identifier: 'item', title: '', bodyXml, responseDeclarations });
      const [interaction] = parseItem(xml).interactions;

      expect(validateQtiItem(xml)).toEqual([]);
      expect(
        textEntryInteractionDescriptor.parse(interaction.bodyXml, interaction.responseDeclarations)
          .answers,
      ).toEqual([{ id: expect.any(String), value: 'NULL', caseSensitive }]);
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
