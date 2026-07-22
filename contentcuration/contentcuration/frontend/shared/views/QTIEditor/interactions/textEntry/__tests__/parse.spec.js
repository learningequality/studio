import {
  _defaultState,
  _extractAnswers,
  _extractPromptHTML,
  parseTextEntryInteraction,
  buildTextEntryInteractionXML,
  FREE_RESPONSE_EXPECTED_LENGTH,
} from '../parse';
import { BaseType, Cardinality, QuestionType } from '../../../constants';

// ─── Fixtures ──────────────────────────────────────────────────────────────

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

/** Build a minimal <qti-item-body> with the given prompt div and the interaction. */
function makeBodyXml({ promptHtml = '', expectedLength = null } = {}) {
  const interactionAttrs = `response-identifier="RESPONSE"${expectedLength ? ` expected-length="${expectedLength}"` : ''}`;
  return `<qti-item-body><div>${promptHtml ? `<div>${promptHtml}</div>` : ''}<p><qti-text-entry-interaction ${interactionAttrs}/></p></div></qti-item-body>`;
}

// ─── _defaultState ─────────────────────────────────────────────────────────

describe('_defaultState', () => {
  it('returns prompt as empty string', () => {
    expect(_defaultState().prompt).toBe('');
  });

  it('returns answers as empty array', () => {
    expect(_defaultState().answers).toEqual([]);
  });

  it('returns expectedLength as 0', () => {
    expect(_defaultState().expectedLength).toBe(0);
  });
});

// ─── _extractAnswers ───────────────────────────────────────────────────────

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
});

// ─── _extractPromptHTML ────────────────────────────────────────────────────

describe('_extractPromptHTML', () => {
  it('returns empty string when no non-interaction content exists', () => {
    const doc = new DOMParser().parseFromString(makeBodyXml(), 'text/xml');
    const bodyEl = doc.documentElement;
    expect(_extractPromptHTML(bodyEl).trim()).toBe('');
  });

  it('excludes the interaction container from the prompt', () => {
    const doc = new DOMParser().parseFromString(
      makeBodyXml({ promptHtml: '<p>What is 3 × 4?</p>' }),
      'text/xml',
    );
    const bodyEl = doc.documentElement;
    const html = _extractPromptHTML(bodyEl);
    expect(html).not.toContain('qti-text-entry-interaction');
    expect(html).toContain('3');
  });
});

// ─── parseTextEntryInteraction ─────────────────────────────────────────────

describe('parseTextEntryInteraction', () => {
  it('returns defaultState when bodyXml is empty', () => {
    expect(parseTextEntryInteraction('', [])).toEqual(_defaultState());
  });

  it('returns defaultState when bodyXml is unparseable', () => {
    expect(parseTextEntryInteraction('<<bad xml', [])).toEqual(_defaultState());
  });

  it('returns defaultState when no interaction element found', () => {
    const bodyXml = '<qti-item-body><p>No interaction here</p></qti-item-body>';
    expect(parseTextEntryInteraction(bodyXml, [])).toEqual(_defaultState());
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
        makeBodyXml({ expectedLength: FREE_RESPONSE_EXPECTED_LENGTH }),
        [FREE_RESPONSE_DECLARATION],
      );
      expect(state.expectedLength).toBe(FREE_RESPONSE_EXPECTED_LENGTH);
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

    it('defaults expectedLength to 0 when absent', () => {
      const state = parseTextEntryInteraction(makeBodyXml(), [SINGLE_NUMERIC_DECLARATION]);
      expect(state.expectedLength).toBe(0);
    });
  });
});

// ─── buildTextEntryInteractionXML ──────────────────────────────────────────

describe('buildTextEntryInteractionXML', () => {
  const FREE_SCHEMA = { baseType: BaseType.STRING, cardinality: Cardinality.SINGLE };
  const NUMERIC_SINGLE_SCHEMA = { baseType: BaseType.FLOAT, cardinality: Cardinality.SINGLE };
  const NUMERIC_MULTI_SCHEMA = { baseType: BaseType.FLOAT, cardinality: Cardinality.MULTIPLE };

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

    it('adds expected-length for freeResponse using FREE_RESPONSE_EXPECTED_LENGTH', () => {
      const { bodyXml } = buildTextEntryInteractionXML(
        { prompt: '', answers: [], expectedLength: 0 },
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      expect(bodyXml).toContain(`expected-length="${FREE_RESPONSE_EXPECTED_LENGTH}"`);
    });

    it('does not add expected-length for numeric when expectedLength is 0', () => {
      const { bodyXml } = buildTextEntryInteractionXML(
        { prompt: '', answers: [{ id: 'a1', value: '12' }], expectedLength: 0 },
        QuestionType.NUMERIC,
        NUMERIC_SINGLE_SCHEMA,
      );
      expect(bodyXml).not.toContain('expected-length');
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
      expect(parsed.expectedLength).toBe(0);
    });

    it('freeResponse: parse → buildXML → parse yields equivalent state', () => {
      const original = {
        prompt: '<p>Describe photosynthesis.</p>',
        answers: [],
        expectedLength: FREE_RESPONSE_EXPECTED_LENGTH,
      };
      const { bodyXml, responseDeclarations } = buildTextEntryInteractionXML(
        original,
        QuestionType.FREE_RESPONSE,
        FREE_SCHEMA,
      );
      const parsed = parseTextEntryInteraction(bodyXml, responseDeclarations);

      expect(parsed.answers).toEqual([]);
      expect(parsed.expectedLength).toBe(FREE_RESPONSE_EXPECTED_LENGTH);
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
  });
});
