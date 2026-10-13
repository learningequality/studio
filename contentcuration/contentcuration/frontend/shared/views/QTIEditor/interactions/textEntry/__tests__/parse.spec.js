import {
  _defaultState,
  _extractAnswers,
  parseTextEntryInteraction,
  buildTextEntryInteractionXML,
  DEFAULT_EXPECTED_LENGTH,
} from '../parse';
import { BaseType, Cardinality, QuestionType } from '../../../constants';
import { assembleItemXml } from '../../../serialization/assembleItem';
import { parseItem } from '../../../serialization/parseItem';

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

const SINGLE_TEXT_DECLARATION_WITH_MAPPING = `
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response>
      <qti-value>Madrid</qti-value>
    </qti-correct-response>
    <qti-mapping default-value="0">
      <qti-map-entry map-key="Madrid" mapped-value="1" case-sensitive="true"/>
      <qti-map-entry map-key="Paris" mapped-value="1"/>
      <qti-map-entry map-key="Rome" mapped-value="1"/>
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

/** The shape legacy input-question conversion writes. */
const CONVERTED_NUMERIC_DECLARATION = `
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float">
    <qti-correct-response>
      <qti-value>13</qti-value>
    </qti-correct-response>
    <qti-mapping default-value="0.0">
      <qti-map-entry map-key="13" mapped-value="1.0" case-sensitive="true"/>
      <qti-map-entry map-key="12" mapped-value="1.0" case-sensitive="true"/>
      <qti-map-entry map-key="11" mapped-value="0.5" case-sensitive="true"/>
    </qti-mapping>
  </qti-response-declaration>
`.trim();

const CONVERTED_STRING_DECLARATION = `
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response>
      <qti-value>Sphere</qti-value>
    </qti-correct-response>
    <qti-mapping default-value="0.0">
      <qti-map-entry map-key="Sphere" mapped-value="1.0" case-sensitive="true"/>
      <qti-map-entry map-key="Ball" mapped-value="1.0" case-sensitive="true"/>
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
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it('returns [] without logging when declaration has no <qti-correct-response>', () => {
    // Legacy conversion writes an answerless input question this way.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const declXml = `
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float"/>
    `.trim();
    expect(_extractAnswers([declXml])).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('assigns unique ids to each answer', () => {
    const result = _extractAnswers([MULTI_NUMERIC_DECLARATION]);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('returns [] when the declaration is too malformed to model', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(_extractAnswers([DECLARATION_WITHOUT_IDENTIFIER])).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });

  describe('mapping-derived case sensitivity', () => {
    it('reads caseSensitive by map-key, taking a mapped key with no <qti-value> as an answer', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = _extractAnswers([TEXT_ENTRY_DECLARATION_WITH_MAPPING]);
      const byValue = Object.fromEntries(result.map(a => [a.value, a.caseSensitive]));
      expect(byValue).toEqual({ Paris: false, Madrid: true, Lisbon: true });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('reads a single-cardinality text mapping in mapping order', () => {
      const result = _extractAnswers([SINGLE_TEXT_DECLARATION_WITH_MAPPING]);
      expect(result.map(a => [a.value, a.caseSensitive])).toEqual([
        ['Madrid', true],
        ['Paris', false],
        ['Rome', false],
      ]);
    });

    it('falls back to correct-response values when the mapping has no entries', () => {
      const declXml = `
        <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
          <qti-correct-response><qti-value>Paris</qti-value></qti-correct-response>
          <qti-mapping default-value="0"/>
        </qti-response-declaration>
      `.trim();
      expect(_extractAnswers([declXml]).map(a => [a.value, a.caseSensitive])).toEqual([
        ['Paris', true],
      ]);
    });

    it('reads text answers as case-sensitive when there is no mapping', () => {
      const result = _extractAnswers([TEXT_ENTRY_DECLARATION_WITHOUT_MAPPING]);
      expect(result).toHaveLength(1);
      expect(result[0].caseSensitive).toBe(true);
    });

    it.each([
      ['string', 'a', 'b', ['a', 'b']],
      ['float', '1', '2', ['1', '2']],
    ])('%s: keeps correct values missing from the mapping', (baseType, first, second, expected) => {
      const declXml = `
        <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="${baseType}">
          <qti-correct-response><qti-value>${first}</qti-value><qti-value>${second}</qti-value></qti-correct-response>
          <qti-mapping default-value="0"><qti-map-entry map-key="${first}" mapped-value="1"/></qti-mapping>
        </qti-response-declaration>
      `.trim();
      expect(_extractAnswers([declXml]).map(a => a.value)).toEqual(expected);
    });

    it.each([
      [['Paris'], ['Paris', 'Rome', 'Paris'], '1', ['Paris', 'Rome', 'Paris']],
      [['Paris'], ['Paris', 'Paris'], '1.0', ['Paris', 'Paris']],
      [['Paris'], ['Paris', 'Paris'], '2', ['Paris']],
      [['Paris'], ['Rome', 'Paris', 'Paris'], '1', ['Paris', 'Rome']],
      [[], ['Paris', 'Paris'], '1', ['Paris']],
    ])(
      'string: reads correct %j with map-keys %j at %s as %j',
      (correct, keys, mapped, expected) => {
        const declXml = `
        <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
          ${correct.length ? `<qti-correct-response>${correct.map(v => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>` : ''}
          <qti-mapping default-value="0">
            ${keys.map(key => `<qti-map-entry map-key="${key}" mapped-value="${mapped}" case-sensitive="false"/>`).join('')}
          </qti-mapping>
        </qti-response-declaration>
      `;
        expect(_extractAnswers([declXml]).map(a => a.value)).toEqual(expected);
      },
    );

    it('string: reads a declaration with partial credit by value', () => {
      const declXml = `
        <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
          <qti-correct-response><qti-value>Paris</qti-value></qti-correct-response>
          <qti-mapping default-value="0">
            <qti-map-entry map-key="Paris" mapped-value="1" case-sensitive="false"/>
            <qti-map-entry map-key="Paris" mapped-value="0.5" case-sensitive="true"/>
            <qti-map-entry map-key="Rome" mapped-value="1" case-sensitive="false"/>
            <qti-map-entry map-key="Rome" mapped-value="1" case-sensitive="false"/>
          </qti-mapping>
        </qti-response-declaration>
      `;
      expect(_extractAnswers([declXml]).map(a => a.value)).toEqual(['Paris', 'Rome']);
    });

    it('reports numeric answers as never case-sensitive', () => {
      const result = _extractAnswers([SINGLE_NUMERIC_DECLARATION]);
      expect(result[0].caseSensitive).toBe(false);
    });

    it('reads every full-credit mapped numeric key, correct response first', () => {
      const result = _extractAnswers([CONVERTED_NUMERIC_DECLARATION]);
      expect(result.map(a => a.value)).toEqual(['13', '12']);
      expect(result.every(a => a.caseSensitive === false)).toBe(true);
    });

    it('reads full-credit mapped keys when there is no <qti-correct-response>', () => {
      const declXml = CONVERTED_NUMERIC_DECLARATION.replace(
        /<qti-correct-response>[\s\S]*<\/qti-correct-response>/,
        '',
      );
      expect(_extractAnswers([declXml]).map(a => a.value)).toEqual(['13', '12']);
    });

    it('matches a map entry for a blank answer value', () => {
      // Both the empty map-key and the empty <qti-value> coerce to null (QTI NULL) and
      // format back to ''; the entry is case-sensitive="true" so a missed lookup can't
      // slip through the false fallback.
      const result = _extractAnswers([BLANK_VALUE_DECLARATION]);
      expect(result).toEqual([expect.objectContaining({ value: '', caseSensitive: true })]);
    });
  });

  describe('numeric values', () => {
    it.each(['21.0', '1e-5', 'e', '1e2e3', '1,234'])(
      'reads numeric value %s as authored from <qti-value> and full-credit map-key',
      value => {
        const declXml = `
          <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="float">
            <qti-correct-response>
              <qti-value>${value}</qti-value>
            </qti-correct-response>
            <qti-mapping default-value="0">
              <qti-map-entry map-key="${value}" mapped-value="1"/>
              <qti-map-entry map-key="${value}9" mapped-value="1"/>
              <qti-map-entry map-key="${value}8" mapped-value="0.5"/>
            </qti-mapping>
          </qti-response-declaration>
        `;
        expect(_extractAnswers([declXml]).map(a => a.value)).toEqual([value, `${value}9`]);
      },
    );

    it.each(['5.0', ' 5 '])(
      'reads full-credit map-key %j equal to a <qti-value> as one answer',
      mapKey => {
        const declXml = `
          <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="float">
            <qti-correct-response>
              <qti-value>5</qti-value>
            </qti-correct-response>
            <qti-mapping default-value="0">
              <qti-map-entry map-key="${mapKey}" mapped-value="1"/>
            </qti-mapping>
          </qti-response-declaration>
        `;
        expect(_extractAnswers([declXml]).map(a => a.value)).toEqual(['5']);
      },
    );

    // The editor's own shape (correct response = first map-key) keeps repeats;
    // any other dedupes map-keys by value against the answers already read.
    it.each([
      [['2'], ['2', '2'], ['2', '2']],
      [['2'], ['2', '2.0'], ['2', '2.0']],
      [['5'], ['5.0', '5'], ['5']],
      [['1'], ['1.0', '1'], ['1']],
      [['1'], ['1', '1.0'], ['1', '1.0']],
      [[], ['1', '1'], ['1']],
    ])('reads correct %j with map-keys %j as %j', (correct, mapKeys, expected) => {
      const declXml = `
        <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float">
          ${correct.length ? `<qti-correct-response>${correct.map(v => `<qti-value>${v}</qti-value>`).join('')}</qti-correct-response>` : ''}
          <qti-mapping default-value="0">
            ${mapKeys.map(key => `<qti-map-entry map-key="${key}" mapped-value="1"/>`).join('')}
          </qti-mapping>
        </qti-response-declaration>
      `;
      expect(_extractAnswers([declXml]).map(a => a.value)).toEqual(expected);
    });

    it('reads mapped-value as a leading number, as Mapping.fromXML does', () => {
      const declXml = `
        <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="float">
          <qti-correct-response>
            <qti-value>1</qti-value>
          </qti-correct-response>
          <qti-mapping default-value="0">
            <qti-map-entry map-key="2" mapped-value="1pt"/>
          </qti-mapping>
        </qti-response-declaration>
      `;
      expect(_extractAnswers([declXml]).map(a => a.value)).toEqual(['1', '2']);
    });

    it('returns [] for a float declaration with record cardinality', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const declXml = `
        <qti-response-declaration identifier="RESPONSE" cardinality="record" base-type="float">
          <qti-correct-response>
            <qti-value>5</qti-value>
          </qti-correct-response>
        </qti-response-declaration>
      `;
      expect(_extractAnswers([declXml])).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
    });

    it.each(['1,234', '1.2.3', '1e400', 'Infinity', '0x10', ''])(
      'reads answers past default value %j, which fromXML accepts',
      defaultValue => {
        const declXml = `
          <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float">
            <qti-default-value><qti-value>${defaultValue}</qti-value></qti-default-value>
            <qti-correct-response><qti-value>5</qti-value></qti-correct-response>
          </qti-response-declaration>
        `;
        expect(_extractAnswers([declXml]).map(a => a.value)).toEqual(['5']);
      },
    );
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
  const TEXT_ENTRY_SCHEMA = { baseType: BaseType.STRING, cardinality: Cardinality.SINGLE };

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

    it('leaves no xhtml namespace on the prompt markup', () => {
      // The prompt comes from the HTML parser; an explicit xmlns on it makes the whole
      // item fail schema validation on the server.
      const { bodyXml } = buildTextEntryInteractionXML(
        { prompt: '<p>What is <strong>H2O</strong>?</p>', answers: [], expectedLength: 0 },
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      expect(bodyXml).not.toContain('http://www.w3.org/1999/xhtml');
    });

    it('keeps the prompt before the interaction', () => {
      const { bodyXml } = buildTextEntryInteractionXML(
        { prompt: '<p>Question</p>', answers: [], expectedLength: 0 },
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      expect(bodyXml.indexOf('Question')).toBeLessThan(
        bodyXml.indexOf('qti-text-entry-interaction'),
      );
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

    const CASE_STATE = { prompt: '', answers: CASE_ANSWERS, expectedLength: 0 };

    /** Build the declaration for the given state and return it as both string and DOM. */
    function buildDeclaration(
      state,
      questionType = QuestionType.TEXT_ENTRY,
      schema = TEXT_ENTRY_SCHEMA,
    ) {
      const { responseDeclarations } = buildTextEntryInteractionXML(state, questionType, schema);
      const [decl] = responseDeclarations;
      return { decl, doc: new DOMParser().parseFromString(decl, 'text/xml') };
    }

    it('emits one qti-map-entry per string answer', () => {
      const { doc } = buildDeclaration(CASE_STATE);
      expect(doc.querySelectorAll('qti-mapping')).toHaveLength(1);

      const entries = [...doc.querySelectorAll('qti-map-entry')];
      expect(entries.map(e => e.getAttribute('map-key'))).toEqual(['Paris', 'Madrid']);
      expect(entries.map(e => e.getAttribute('mapped-value'))).toEqual(['1', '1']);
    });

    it('writes case-sensitive="true" only for case-sensitive answers', () => {
      const entries = [...buildDeclaration(CASE_STATE).doc.querySelectorAll('qti-map-entry')];
      // null = attribute absent; false is the XSD default and so is left unwritten.
      expect(entries.map(e => e.getAttribute('case-sensitive'))).toEqual([null, 'true']);
    });

    it('keeps a blank numeric answer row as a blank map entry', () => {
      const { doc } = buildDeclaration(
        {
          prompt: '',
          answers: [
            { id: 'a1', value: '1' },
            { id: 'a2', value: '' },
          ],
          expectedLength: 0,
        },
        QuestionType.NUMERIC,
        NUMERIC_SINGLE_SCHEMA,
      );
      const entries = [...doc.querySelectorAll('qti-map-entry')];
      expect(entries.map(e => e.getAttribute('map-key'))).toEqual(['1', '']);
    });

    it('emits no mapping for free response', () => {
      const { doc } = buildDeclaration(CASE_STATE, QuestionType.FREE_RESPONSE, FREE_SCHEMA);
      expect(doc.querySelector('qti-mapping')).toBeNull();
    });

    it('emits no mapping when there are zero answers', () => {
      const { doc } = buildDeclaration({ ...CASE_STATE, answers: [] });
      expect(doc.querySelector('qti-mapping')).toBeNull();
    });

    it('emits qti-mapping after qti-correct-response per the XSD sequence', () => {
      const { decl } = buildDeclaration(CASE_STATE);
      expect(decl.indexOf('<qti-correct-response')).toBeLessThan(decl.indexOf('<qti-mapping'));
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

    it('multi-answer numeric: round-trip preserves all values in order', () => {
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
        NUMERIC_SINGLE_SCHEMA,
      );
      const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);
      expect(parsed.answers.map(a => a.value)).toEqual(['0.5', '1.5']);
    });

    it.each([
      [
        'numeric',
        CONVERTED_NUMERIC_DECLARATION,
        QuestionType.NUMERIC,
        BaseType.FLOAT,
        ['13', '12'],
      ],
      [
        'textEntry',
        CONVERTED_STRING_DECLARATION,
        QuestionType.TEXT_ENTRY,
        BaseType.STRING,
        ['Sphere', 'Ball'],
      ],
    ])(
      '%s: re-saving a converted legacy item keeps every accepted answer',
      (_, declaration, questionType, baseType, expected) => {
        const state = parseTextEntryInteraction(makeBodyXml(), [declaration]);
        const { bodyXml, responseDeclarations } = buildTextEntryInteractionXML(
          state,
          questionType,
          { baseType, cardinality: Cardinality.MULTIPLE },
        );
        const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);
        expect(parsed.answers.map(a => a.value)).toEqual(expected);
      },
    );

    it.each([
      [
        'an image',
        '<p>Look:</p><img src="x.png" alt="a">',
        '<p>Look:</p><div><img src="x.png" alt="a"></div>',
      ],
      [
        'small text',
        '<small class="small-text">s</small>',
        '<div><small class="small-text">s</small></div>',
      ],
      [
        'an image and small text',
        '<img src="x.png" alt="a"><small class="small-text">s</small>',
        '<div><img src="x.png" alt="a"><small class="small-text">s</small></div>',
      ],
      [
        'empty small text',
        '<p>a</p><small class="small-text"></small><p>b</p>',
        '<p>a</p><div><small class="small-text"></small></div><p>b</p>',
      ],
      ['bare text', 'Q?', '<div>Q?</div>'],
    ])('prompt with %s reopens wrapped and rebuilds identically', (_, prompt, expectedPrompt) => {
      const build = state =>
        buildTextEntryInteractionXML(state, QuestionType.FREE_RESPONSE, FREE_SCHEMA);
      const first = build({ prompt, answers: [], expectedLength: 0 });
      const { bodyXml, responseDeclarations } = parseItem(
        assembleItemXml({ ...first, identifier: 'i', title: 't', language: '' }),
      ).interactions[0];
      const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);

      expect(parsed.prompt).toBe(expectedPrompt);
      expect(build(parsed).bodyXml).toBe(first.bodyXml);
    });

    it('textEntry: round-trip preserves per-answer caseSensitive', () => {
      const original = {
        prompt: '<p>Name a capital city.</p>',
        answers: [
          { id: 'a1', value: 'Paris', caseSensitive: false },
          { id: 'a2', value: 'Madrid', caseSensitive: true },
          // Padded: keeps its flag only if map-key is written trimmed. Case-sensitive
          // because false is also the no-match fallback, which would hide a miss.
          { id: 'a3', value: '  Rome  ', caseSensitive: true },
        ],
        expectedLength: 0,
      };
      const { bodyXml, responseDeclarations } = buildTextEntryInteractionXML(
        original,
        QuestionType.TEXT_ENTRY,
        TEXT_ENTRY_SCHEMA,
      );
      const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);

      expect(parsed.answers.map(a => [a.value, a.caseSensitive])).toEqual([
        ['Paris', false],
        ['Madrid', true],
        ['Rome', true],
      ]);
    });
  });
});
