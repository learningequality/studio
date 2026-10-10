import { isEditableItem, validateItemShape, validateQtiItem } from '../validateItem';
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
  CHOICE_ITEM_DOCUMENT_WITH_HINTS,
  CHOICE_ITEM_DOCUMENT_WITH_SCHEMA_LOCATION,
  STYLESHEET_ITEM_DOCUMENT_NO_PROMPT,
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

  it('applies editor rules to an item with content an edit would drop', () => {
    expect(codesOf(validateQtiItem(STYLESHEET_ITEM_DOCUMENT_NO_PROMPT))).toContain(
      ValidationError.PROMPT_REQUIRED,
    );
    const templatedAnswer = CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace(
      /<qti-correct-response>[\s\S]*<\/qti-correct-response>/,
      '',
    ).replace(
      '  <qti-item-body>',
      `  <qti-template-processing>
    <qti-set-correct-response identifier="RESPONSE">
      <qti-base-value base-type="identifier">choice-a</qti-base-value>
    </qti-set-correct-response>
  </qti-template-processing>
  <qti-item-body>`,
    );
    expect(codesOf(validateQtiItem(templatedAnswer))).toContain(ValidationError.NO_CORRECT_ANSWER);
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

  function expectSameCodesAsEditor(state, questionType, expected) {
    const { bodyXml, responseDeclarations } = textEntryInteractionDescriptor.buildXML(
      state,
      questionType,
    );
    const xml = assembleItemXml({ identifier: 'item', title: '', bodyXml, responseDeclarations });

    expect(codesOf(validateTextEntryInteraction(state, questionType))).toEqual(expected);
    expect(codesOf(validateQtiItem(xml))).toEqual(expected);
  }

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
      expectSameCodesAsEditor(state, QuestionType.NUMERIC, expected);
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

    const { EMPTY_ANSWER_CONTENT, DUPLICATE_ANSWER_CONTENT } = ValidationError;
    const duplicates = [DUPLICATE_ANSWER_CONTENT, DUPLICATE_ANSWER_CONTENT];

    it.each([
      [['Paris', 'Paris'], [false, false], duplicates],
      [['Paris', ' Paris'], [false, false], duplicates],
      [['Paris', 'paris'], [false, false], duplicates],
      [['Paris', 'Paris'], [true, false], []],
      [
        ['', ''],
        [false, false],
        [EMPTY_ANSWER_CONTENT, EMPTY_ANSWER_CONTENT],
      ],
    ])(
      'reports %j (case-sensitive %j) as %j, the same as the editor',
      (values, flags, expected) => {
        const state = {
          prompt: '<p>Name the capital of France</p>',
          answers: values.map((value, i) => ({
            id: `a${i}`,
            value,
            caseSensitive: flags[i],
          })),
          expectedLength: 0,
        };
        expectSameCodesAsEditor(state, QuestionType.TEXT_ENTRY, expected);
      },
    );
  });

  it('reports unparseable XML', () => {
    expect(validateQtiItem('<qti-assessment-item><oops>')).toEqual([
      { code: ValidationError.PARSE_ERROR },
    ]);
  });
});

describe('isEditableItem', () => {
  const isEditable = xml => isEditableItem(parseItem(xml), xml);
  const withRoot = attrs =>
    CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace('xml:lang="en"', `xml:lang="en" ${attrs}`);
  const withScoring = (outcomeDeclarations, responseProcessing = '') =>
    CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace(
      '\n\n  <qti-item-body>',
      `\n  ${outcomeDeclarations}\n  <qti-item-body>`,
    ).replace('\n</qti-assessment-item>', `\n  ${responseProcessing}\n</qti-assessment-item>`);
  const FEEDBACK_OUTCOME =
    '<qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>';
  const withHintCard = card =>
    CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace(
      '<qti-catalog id="kolibri-hints">',
      `<qti-catalog id="kolibri-hints">\n      ${card}`,
    );

  it.each([
    ['hints', CHOICE_ITEM_DOCUMENT_WITH_HINTS],
    ['xsi:schemaLocation', CHOICE_ITEM_DOCUMENT_WITH_SCHEMA_LOCATION],
    ['converter metadata', withRoot('label="L" tool-name="other" tool-version="2"')],
    ['adaptive="0"', CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace('adaptive="false"', 'adaptive="0"')],
    [
      'time-dependent="0"',
      CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace('time-dependent="false"', 'time-dependent="0"'),
    ],
    [
      'explicit match_correct rules',
      withScoring(
        '<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>',
        `<qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-match><qti-variable identifier="RESPONSE"/><qti-correct identifier="RESPONSE"/></qti-match>
        <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">1</qti-base-value></qti-set-outcome-value>
      </qti-response-if>
    </qti-response-condition>
  </qti-response-processing>`,
      ),
    ],
    [
      'a non-zero default SCORE',
      withScoring(`<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>1</qti-value></qti-default-value>
  </qti-outcome-declaration>`),
    ],
    [
      'a score maximum and a MAXSCORE outcome',
      withScoring(
        `<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" normal-maximum="1"/>
  <qti-outcome-declaration identifier="MAXSCORE" cardinality="single" base-type="float"/>`,
      ),
    ],
    [
      'a response declaration no interaction uses',
      withScoring(
        '<qti-response-declaration identifier="UNUSED" cardinality="single" base-type="identifier"/>',
      ),
    ],
    [
      'a pretty-printed bare-text hint',
      withHintCard(`<qti-card support="ext:kolibri-hint">
        <qti-html-content>
          Try halving it first
        </qti-html-content>
      </qti-card>`),
    ],
    [
      'an empty hint card',
      withHintCard('<qti-card support="ext:kolibri-hint"><qti-html-content/></qti-card>'),
    ],
  ])('is true for an item with %s', (_, xml) => {
    expect(isEditable(xml)).toBe(true);
  });

  it.each([
    [
      'hint cards in a catalog by another id',
      CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace(
        '<qti-catalog id="kolibri-hints">',
        '<qti-catalog id="g1">',
      ),
    ],
    [
      'an attribute on the catalog info',
      CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace(
        '<qti-catalog-info>',
        '<qti-catalog-info data-x="1">',
      ),
    ],
    [
      'a non-hint card in the hint catalog',
      withHintCard(
        '<qti-card support="glossary-on-screen"><qti-html-content><p>Term</p></qti-html-content></qti-card>',
      ),
    ],
    [
      'a hint card in two languages',
      withHintCard(`<qti-card support="ext:kolibri-hint">
        <qti-card-entry xml:lang="en"><qti-html-content><p>Hi</p></qti-html-content></qti-card-entry>
        <qti-card-entry xml:lang="es"><qti-html-content><p>Hola</p></qti-html-content></qti-card-entry>
      </qti-card>`),
    ],
    [
      'a hint card pointing at a file',
      withHintCard(
        '<qti-card support="ext:kolibri-hint"><qti-file-href mime-type="text/html">hint.html</qti-file-href></qti-card>',
      ),
    ],
    [
      'a language on a hint card',
      CHOICE_ITEM_DOCUMENT_WITH_HINTS.replaceAll(
        '<qti-card support="ext:kolibri-hint">',
        '<qti-card support="ext:kolibri-hint" xml:lang="es">',
      ),
    ],
    [
      'a language on hint content',
      withHintCard(
        '<qti-card support="ext:kolibri-hint"><qti-html-content xml:lang="es"><p>Hola</p></qti-html-content></qti-card>',
      ),
    ],
    ['an unknown root attribute', withRoot('foo="bar"')],
    ['a root attribute in another namespace', withRoot('xmlns:x="urn:x" x:label="L"')],
    [
      'adaptive="true"',
      CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace('adaptive="false"', 'adaptive="true"'),
    ],
    [
      'time-dependent="true"',
      CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace('time-dependent="false"', 'time-dependent="true"'),
    ],
    [
      'a known child in another namespace',
      withScoring('<x:qti-outcome-declaration xmlns:x="urn:x" identifier="X"/>'),
    ],
    ['text outside the body', withScoring('Stray text')],
    [
      'a root language xml:lang does not accept',
      CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace('xml:lang="en"', 'language="en_US"'),
    ],
    [
      'feedback on an outcome an edit drops',
      withScoring(FEEDBACK_OUTCOME).replace(
        '>A</qti-simple-choice>',
        '>A<qti-feedback-inline outcome-identifier="FEEDBACK" identifier="choice-a" show-hide="show">Yes</qti-feedback-inline></qti-simple-choice>',
      ),
    ],
    [
      'a printed outcome an edit drops',
      withScoring(FEEDBACK_OUTCOME).replace(
        'Pick one.',
        'Pick one. <qti-printed-variable identifier="FEEDBACK"/>',
      ),
    ],
    [
      'a printed SCORE',
      withScoring(
        '<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>',
      ).replace('Pick one.', 'Pick one. <qti-printed-variable identifier="SCORE"/>'),
    ],
    [
      'feedback on SCORE',
      CHOICE_ITEM_DOCUMENT_WITH_HINTS.replace(
        '>A</qti-simple-choice>',
        '>A<qti-feedback-inline outcome-identifier="SCORE" identifier="choice-a" show-hide="show">Yes</qti-feedback-inline></qti-simple-choice>',
      ),
    ],
    [
      'a hint card in another namespace',
      withHintCard(
        '<x:qti-card xmlns:x="urn:x" support="ext:kolibri-hint"><qti-html-content><p>hidden</p></qti-html-content></x:qti-card>',
      ),
    ],
  ])('is false for an item with %s', (_, xml) => {
    expect(isEditable(xml)).toBe(false);
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
