import {
  _defaultState,
  _extractAnswers,
  parseTextEntryInteraction,
  buildTextEntryInteractionXML,
  DEFAULT_EXPECTED_LENGTH,
} from '../parse';
import { BaseType, Cardinality, QuestionType } from '../../../constants';

const FREE_RESPONSE_DECLARATION = `
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string"/>
`.trim();

const SINGLE_NUMERIC_DECLARATION = `
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float">
    <qti-correct-response>
      <qti-value>12</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
`.trim();

const MULTI_NUMERIC_DECLARATION = `
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="float">
    <qti-correct-response>
      <qti-value>0.5</qti-value>
      <qti-value>1.5</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
`.trim();

const TEXT_ENTRY_DECLARATION_WITH_MAPPING = `
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="string">
    <qti-correct-response>
      <qti-value>Paris</qti-value>
      <qti-value>Madrid</qti-value>
    </qti-correct-response>
    <qti-mapping default-value="0">
      <qti-map-entry map-key="Paris" mapped-value="1" case-sensitive="false"/>
      <qti-map-entry map-key="Madrid" mapped-value="1" case-sensitive="true"/>
      <qti-map-entry map-key="Lisbon" mapped-value="1" case-sensitive="true"/>
    </qti-mapping>
  </qti-response-declaration>
`.trim();

const TEXT_ENTRY_DECLARATION_WITHOUT_MAPPING = `
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response>
      <qti-value>Paris</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
`.trim();

const BLANK_VALUE_DECLARATION = `
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response>
      <qti-value></qti-value>
    </qti-correct-response>
    <qti-mapping default-value="0">
      <qti-map-entry map-key="" mapped-value="1" case-sensitive="true"/>
    </qti-mapping>
  </qti-response-declaration>
`.trim();

/** `identifier` is required by the QTI schema — QTIDeclaration refuses to model this. */
const DECLARATION_WITHOUT_IDENTIFIER = `
  <qti-response-declaration cardinality="single" base-type="string">
    <qti-correct-response>
      <qti-value>Paris</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
`.trim();

/** Build a minimal <qti-item-body> with the given prompt div and the interaction. */
function makeBodyXml({ promptHtml = '', expectedLength = null } = {}) {
  const interactionAttrs = `response-identifier="RESPONSE"${expectedLength ? ` expected-length="${expectedLength}"` : ''}`;
  return `<qti-item-body><div>${promptHtml ? `<div>${promptHtml}</div>` : ''}<p><qti-text-entry-interaction ${interactionAttrs}/></p></div></qti-item-body>`;
}

describe('_defaultState', () => {
  it('returns prompt as empty string', () => {
    expect(_defaultState().prompt).toBe('');
  });

  it('returns answers as an array with one empty answer seeded', () => {
    const answers = _defaultState().answers;
    expect(answers).toHaveLength(1);
    expect(answers[0].value).toBe('');
    expect(answers[0].caseSensitive).toBe(false);
    expect(typeof answers[0].id).toBe('string');
  });

  it('returns expectedLength as DEFAULT_EXPECTED_LENGTH', () => {
    expect(_defaultState().expectedLength).toBe(DEFAULT_EXPECTED_LENGTH);
  });
});

describe('_extractAnswers', () => {
  it('returns [] when no declaration is provided', () => {
    expect(_extractAnswers([])).toEqual([]);
  });

  it('returns [] for a free-response (string base-type) declaration', () => {
    expect(_extractAnswers([FREE_RESPONSE_DECLARATION])).toEqual([]);
  });

  it('returns one answer for a single numeric declaration', () => {
    const result = _extractAnswers([SINGLE_NUMERIC_DECLARATION]);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('12');
    expect(result[0].id).toMatch(/^answer_/);
  });

  it('returns two answers for a multiple numeric declaration', () => {
    const result = _extractAnswers([MULTI_NUMERIC_DECLARATION]);
    expect(result).toHaveLength(2);
    expect(result.map(a => a.value)).toEqual(['0.5', '1.5']);
  });

  it('returns [] when declaration has no <qti-correct-response>', () => {
    const declXml = `
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float"/>
    `.trim();
    expect(_extractAnswers([declXml])).toEqual([]);
  });

  it('assigns unique ids to each answer', () => {
    const result = _extractAnswers([MULTI_NUMERIC_DECLARATION]);
    expect(result[0].id).not.toBe(result[1].id);
  });

  describe('mapping-derived case sensitivity', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('reads caseSensitive by map-key, silently ignoring unmatched entries', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = _extractAnswers([TEXT_ENTRY_DECLARATION_WITH_MAPPING]);
      // The Lisbon entry has no <qti-value>, so it contributes no answer and no error.
      const byValue = Object.fromEntries(result.map(a => [a.value, a.caseSensitive]));
      expect(byValue).toEqual({ Paris: false, Madrid: true });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('falls back to caseSensitive false when there is no mapping', () => {
      const result = _extractAnswers([TEXT_ENTRY_DECLARATION_WITHOUT_MAPPING]);
      expect(result).toHaveLength(1);
      expect(result[0].caseSensitive).toBe(false);
    });

    it('reports numeric answers as never case-sensitive', () => {
      const result = _extractAnswers([SINGLE_NUMERIC_DECLARATION]);
      expect(result[0].caseSensitive).toBe(false);
    });

    it('matches a map entry for a blank answer value', () => {
      // An empty map-key coerces to null (QTI NULL semantics) while the answer value
      // is the empty string, so the two must still be matched up. The entry declares
      // case-sensitive="true", which the no-match fallback would never produce.
      const result = _extractAnswers([BLANK_VALUE_DECLARATION]);
      expect(result).toEqual([expect.objectContaining({ value: '', caseSensitive: true })]);
    });

    it('keeps the answers when the declaration is too malformed to model', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = _extractAnswers([DECLARATION_WITHOUT_IDENTIFIER]);
      expect(result).toEqual([expect.objectContaining({ value: 'Paris', caseSensitive: false })]);
    });
  });
});

describe('parseTextEntryInteraction', () => {
  it('returns defaultState when bodyXml is empty', () => {
    const state = parseTextEntryInteraction('', []);
    expect(state.prompt).toBe('');
    expect(state.expectedLength).toBe(DEFAULT_EXPECTED_LENGTH);
    expect(state.answers).toHaveLength(1);
  });

  it('returns defaultState when bodyXml is unparseable', () => {
    const state = parseTextEntryInteraction('<<bad xml', []);
    expect(state.prompt).toBe('');
    expect(state.answers).toHaveLength(1);
  });

  it('returns defaultState when no interaction element found', () => {
    const bodyXml = '<qti-item-body><p>No interaction here</p></qti-item-body>';
    const state = parseTextEntryInteraction(bodyXml, []);
    expect(state.prompt).toBe('');
    expect(state.answers).toHaveLength(1);
  });

  describe('freeResponse', () => {
    it('sets answers to [] for a free-response declaration', () => {
      const state = parseTextEntryInteraction(makeBodyXml(), [FREE_RESPONSE_DECLARATION]);
      expect(state.answers).toEqual([]);
    });

    it('defaults to freeResponse (answers: []) when declaration is missing', () => {
      const state = parseTextEntryInteraction(makeBodyXml(), []);
      expect(state.answers).toEqual([]);
    });

    it('reads expectedLength from the element attribute', () => {
      const state = parseTextEntryInteraction(
        makeBodyXml({ expectedLength: DEFAULT_EXPECTED_LENGTH }),
        [FREE_RESPONSE_DECLARATION],
      );
      expect(state.expectedLength).toBe(DEFAULT_EXPECTED_LENGTH);
    });
  });

  describe('numeric', () => {
    it('parses a single numeric answer', () => {
      const state = parseTextEntryInteraction(makeBodyXml(), [SINGLE_NUMERIC_DECLARATION]);
      expect(state.answers).toHaveLength(1);
      expect(state.answers[0].value).toBe('12');
    });

    it('parses multiple numeric answers', () => {
      const state = parseTextEntryInteraction(makeBodyXml(), [MULTI_NUMERIC_DECLARATION]);
      expect(state.answers).toHaveLength(2);
      expect(state.answers.map(a => a.value)).toEqual(['0.5', '1.5']);
    });
  });
});

describe('buildTextEntryInteractionXML', () => {
  const FREE_SCHEMA = { baseType: BaseType.STRING, cardinality: Cardinality.SINGLE };
  const NUMERIC_SINGLE_SCHEMA = { baseType: BaseType.FLOAT, cardinality: Cardinality.SINGLE };
  const NUMERIC_MULTI_SCHEMA = { baseType: BaseType.FLOAT, cardinality: Cardinality.MULTIPLE };
  const TEXT_ENTRY_MULTI_SCHEMA = { baseType: BaseType.STRING, cardinality: Cardinality.MULTIPLE };

  describe('bodyXml', () => {
    it('produces a well-formed <qti-item-body>', () => {
      const { bodyXml } = buildTextEntryInteractionXML(
        { prompt: '<p>Hello</p>', answers: [], expectedLength: 0 },
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      const doc = new DOMParser().parseFromString(bodyXml, 'text/xml');
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.querySelector('qti-item-body')).not.toBeNull();
    });

    it('contains a <qti-text-entry-interaction> element', () => {
      const { bodyXml } = buildTextEntryInteractionXML(
        { prompt: '', answers: [], expectedLength: 0 },
        QuestionType.NUMERIC,
        NUMERIC_SINGLE_SCHEMA,
      );
      expect(bodyXml).toContain('qti-text-entry-interaction');
    });

    it('sets response-identifier="RESPONSE"', () => {
      const { bodyXml } = buildTextEntryInteractionXML(
        { prompt: '', answers: [], expectedLength: 0 },
        QuestionType.NUMERIC,
        NUMERIC_SINGLE_SCHEMA,
      );
      expect(bodyXml).toContain('response-identifier="RESPONSE"');
    });

    it('adds expected-length using DEFAULT_EXPECTED_LENGTH for all types', () => {
      const { bodyXml } = buildTextEntryInteractionXML(
        _defaultState(),
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      expect(bodyXml).toContain(`expected-length="${DEFAULT_EXPECTED_LENGTH}"`);
    });

    it('uses provided expectedLength instead of DEFAULT_EXPECTED_LENGTH', () => {
      const state = _defaultState();
      state.expectedLength = 100;
      const { bodyXml } = buildTextEntryInteractionXML(
        state,
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      expect(bodyXml).toContain(`expected-length="100"`);
    });
  });

  describe('responseDeclarations', () => {
    it('emits exactly one declaration', () => {
      const { responseDeclarations } = buildTextEntryInteractionXML(
        { prompt: '', answers: [], expectedLength: 0 },
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      expect(responseDeclarations).toHaveLength(1);
    });

    it('free response has base-type="string" and no <qti-correct-response>', () => {
      const { responseDeclarations } = buildTextEntryInteractionXML(
        { prompt: '', answers: [], expectedLength: 0 },
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      expect(responseDeclarations[0]).toContain('base-type="string"');
      expect(responseDeclarations[0]).not.toContain('qti-correct-response');
    });

    it('numeric with 1 answer gets cardinality="single"', () => {
      const { responseDeclarations } = buildTextEntryInteractionXML(
        { prompt: '', answers: [{ id: 'a1', value: '12' }], expectedLength: 0 },
        QuestionType.NUMERIC,
        NUMERIC_SINGLE_SCHEMA,
      );
      expect(responseDeclarations[0]).toContain('cardinality="single"');
      expect(responseDeclarations[0]).toContain('base-type="float"');
    });

    it('numeric with 2+ answers gets cardinality="multiple"', () => {
      const { responseDeclarations } = buildTextEntryInteractionXML(
        {
          prompt: '',
          answers: [
            { id: 'a1', value: '0.5' },
            { id: 'a2', value: '1.5' },
          ],
          expectedLength: 0,
        },
        QuestionType.NUMERIC,
        NUMERIC_MULTI_SCHEMA,
      );
      expect(responseDeclarations[0]).toContain('cardinality="multiple"');
    });

    it('numeric includes <qti-correct-response> with each answer value', () => {
      const { responseDeclarations } = buildTextEntryInteractionXML(
        {
          prompt: '',
          answers: [
            { id: 'a1', value: '0.5' },
            { id: 'a2', value: '1.5' },
          ],
          expectedLength: 0,
        },
        QuestionType.NUMERIC,
        NUMERIC_MULTI_SCHEMA,
      );
      expect(responseDeclarations[0]).toContain('qti-correct-response');
      expect(responseDeclarations[0]).toContain('>0.5<');
      expect(responseDeclarations[0]).toContain('>1.5<');
    });

    it('numeric with 0 answers omits <qti-correct-response> (empty element is invalid per XSD)', () => {
      const { responseDeclarations } = buildTextEntryInteractionXML(
        { prompt: '', answers: [], expectedLength: 0 },
        QuestionType.NUMERIC,
        NUMERIC_SINGLE_SCHEMA,
      );
      expect(responseDeclarations[0]).not.toContain('qti-correct-response');
    });
  });

  describe('mapping', () => {
    const CASE_ANSWERS = [
      { id: 'a1', value: 'Paris', caseSensitive: false },
      { id: 'a2', value: 'Madrid', caseSensitive: true },
    ];

    /** Build the declaration for the given state and return it as both string and DOM. */
    function buildDeclaration(state, questionType, schema) {
      const { responseDeclarations } = buildTextEntryInteractionXML(state, questionType, schema);
      const [decl] = responseDeclarations;
      return { decl, doc: new DOMParser().parseFromString(decl, 'text/xml') };
    }

    /** The happy-path build, shared by the tests that assert on CASE_ANSWERS. */
    function buildCaseDeclaration() {
      return buildDeclaration(
        { prompt: '', answers: CASE_ANSWERS, expectedLength: 0 },
        QuestionType.TEXT_ENTRY,
        TEXT_ENTRY_MULTI_SCHEMA,
      );
    }

    it('emits one qti-map-entry per string answer', () => {
      const { doc } = buildCaseDeclaration();
      expect(doc.querySelectorAll('qti-mapping')).toHaveLength(1);

      const entries = [...doc.querySelectorAll('qti-map-entry')];
      expect(entries.map(e => e.getAttribute('map-key'))).toEqual(['Paris', 'Madrid']);
      expect(entries.map(e => e.getAttribute('mapped-value'))).toEqual(['1', '1']);
    });

    it('writes case-sensitive="true" only for case-sensitive answers', () => {
      const entries = [...buildCaseDeclaration().doc.querySelectorAll('qti-map-entry')];
      // getAttribute is null when the attribute is absent — Paris is case-insensitive,
      // which is the XSD default for the attribute and so is left unwritten.
      expect(entries.map(e => e.getAttribute('case-sensitive'))).toEqual([null, 'true']);
    });

    it('emits no mapping for numeric answers', () => {
      const { doc } = buildDeclaration(
        {
          prompt: '',
          answers: [
            { id: 'a1', value: '0.5' },
            { id: 'a2', value: '1.5' },
          ],
          expectedLength: 0,
        },
        QuestionType.NUMERIC,
        NUMERIC_MULTI_SCHEMA,
      );
      expect(doc.querySelector('qti-mapping')).toBeNull();
    });

    it('emits no mapping for free response', () => {
      const { doc } = buildDeclaration(
        { prompt: '', answers: CASE_ANSWERS, expectedLength: 0 },
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      expect(doc.querySelector('qti-mapping')).toBeNull();
    });

    it('emits no mapping when there are zero answers', () => {
      const { doc } = buildDeclaration(
        { prompt: '', answers: [], expectedLength: 0 },
        QuestionType.TEXT_ENTRY,
        TEXT_ENTRY_MULTI_SCHEMA,
      );
      expect(doc.querySelector('qti-mapping')).toBeNull();
    });

    it('emits qti-mapping after qti-correct-response per the XSD sequence', () => {
      const { decl } = buildCaseDeclaration();
      expect(decl.indexOf('<qti-correct-response')).toBeLessThan(decl.indexOf('<qti-mapping'));
    });

    it('trims map-key to match the value the parser reads back', () => {
      const { doc } = buildDeclaration(
        {
          prompt: '',
          answers: [{ id: 'a1', value: '  Paris  ', caseSensitive: false }],
          expectedLength: 0,
        },
        QuestionType.TEXT_ENTRY,
        TEXT_ENTRY_MULTI_SCHEMA,
      );
      const mapKey = doc.querySelector('qti-map-entry').getAttribute('map-key');
      expect(mapKey).toBe('Paris');
    });
  });

  describe('round-trip', () => {
    it('numeric: parse → buildXML → parse yields equivalent state', () => {
      const original = {
        prompt: '<p>What is 3 × 4?</p>',
        answers: [{ id: 'a1', value: '12' }],
        expectedLength: 0,
      };
      const { bodyXml, responseDeclarations } = buildTextEntryInteractionXML(
        original,
        QuestionType.NUMERIC,
        NUMERIC_SINGLE_SCHEMA,
      );
      const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);

      expect(parsed.answers).toHaveLength(1);
      expect(parsed.answers[0].value).toBe('12');
      expect(parsed.expectedLength).toBe(DEFAULT_EXPECTED_LENGTH);
      expect(parsed.prompt).toBe(original.prompt);
    });

    it('freeResponse: parse → buildXML → parse yields equivalent state', () => {
      const state = {
        prompt: '<p>A question prompt.</p>',
        expectedLength: DEFAULT_EXPECTED_LENGTH,
        answers: [],
      };
      const { bodyXml, responseDeclarations } = buildTextEntryInteractionXML(
        state,
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );

      const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);

      expect(parsed.prompt).toBe('<p>A question prompt.</p>');
      expect(parsed.expectedLength).toBe(DEFAULT_EXPECTED_LENGTH);
    });

    it('multi-answer numeric: round-trip preserves all values', () => {
      const original = {
        prompt: '<p>Q</p>',
        answers: [
          { id: 'a1', value: '0.5' },
          { id: 'a2', value: '1.5' },
        ],
        expectedLength: 0,
      };
      const { bodyXml, responseDeclarations } = buildTextEntryInteractionXML(
        original,
        QuestionType.NUMERIC,
        NUMERIC_MULTI_SCHEMA,
      );
      const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);
      expect(parsed.answers.map(a => a.value)).toEqual(['0.5', '1.5']);
    });

    it('textEntry: round-trip preserves per-answer caseSensitive', () => {
      const original = {
        prompt: '<p>Name a capital city.</p>',
        answers: [
          { id: 'a1', value: 'Paris', caseSensitive: false },
          { id: 'a2', value: 'Madrid', caseSensitive: true },
          { id: 'a3', value: '  Rome  ', caseSensitive: false },
        ],
        expectedLength: 0,
      };
      const { bodyXml, responseDeclarations } = buildTextEntryInteractionXML(
        original,
        QuestionType.TEXT_ENTRY,
        TEXT_ENTRY_MULTI_SCHEMA,
      );
      const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);

      const byValue = Object.fromEntries(parsed.answers.map(a => [a.value, a.caseSensitive]));
      expect(byValue).toEqual({ Paris: false, Madrid: true, Rome: false });
    });
  });
});
