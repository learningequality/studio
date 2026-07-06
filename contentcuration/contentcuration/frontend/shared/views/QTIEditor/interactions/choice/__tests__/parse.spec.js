/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
// The eslint-dom matchers reject XML nodes produced by DOMParser(..., 'text/xml').
// Native DOM APIs (getAttribute, textContent) work correctly on XML elements.

import { choiceInteractionDescriptor } from '../ChoiceInteractionDescriptor';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  CHOICE_NO_PROMPT_XML,
  CHOICE_SINGLE_DECL_XML as SINGLE_DECL,
  CHOICE_MULTI_DECL_XML as MULTI_DECL,
} from '../../../utils/testingFixtures';
import { QuestionType } from '../../../constants';

const parse = choiceInteractionDescriptor.parse.bind(choiceInteractionDescriptor);
const buildXML = choiceInteractionDescriptor.buildXML.bind(choiceInteractionDescriptor);

describe('parse()', () => {
  describe('attribute defaults', () => {
    it('defaults maxChoices to 0 when attribute is absent', () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-choice-interaction>`;
      const state = parse(xml, []);
      expect(state.maxChoices).toBe(0);
    });

    it('defaults minChoices to 0 when attribute is absent', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.minChoices).toBe(0);
    });

    it('defaults shuffle to false when attribute is absent', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.shuffle).toBe(false);
    });

    it('defaults orientation to "vertical" when attribute is absent', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.orientation).toBe('vertical');
    });

    it('defaults prompt to empty string when <qti-prompt> is absent', () => {
      const state = parse(CHOICE_NO_PROMPT_XML, []);
      expect(state.prompt).toBe('');
    });
  });

  describe('attribute reading', () => {
    it('reads max-choices attribute', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.maxChoices).toBe(1);
    });

    it('reads shuffle attribute when true', () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" shuffle="true">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-choice-interaction>`;
      expect(parse(xml, []).shuffle).toBe(true);
    });

    it('reads orientation attribute', () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" orientation="horizontal">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-choice-interaction>`;
      expect(parse(xml, []).orientation).toBe('horizontal');
    });
  });

  describe('prompt extraction', () => {
    it('extracts the prompt text content', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.prompt).toContain('Which planet is closest to the Sun?');
    });
  });

  describe('choices array', () => {
    it('maps each <qti-simple-choice> to an choice with id and content', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.choices).toHaveLength(3);
      expect(state.choices[0].id).toBe('mercury');
      expect(state.choices[0].content).toContain('Mercury');
    });

    it('generates a slug identifier when element is missing its identifier attribute', () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
        <qti-simple-choice>No id here</qti-simple-choice>
      </qti-choice-interaction>`;
      const state = parse(xml, []);
      expect(state.choices[0].id).toMatch(/^choice_[a-z0-9]{8}$/);
    });

    it('sets fixed: true when the fixed attribute is present', () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
        <qti-simple-choice identifier="a" fixed="true">A</qti-simple-choice>
      </qti-choice-interaction>`;
      const state = parse(xml, []);
      expect(state.choices[0].fixed).toBe(true);
    });

    it('sets fixed: false when the fixed attribute is absent', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.choices[0].fixed).toBe(false);
    });
  });

  describe('correct response detection', () => {
    it('marks the correct choice for single-select', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, [SINGLE_DECL]);
      const mercury = state.choices.find(a => a.id === 'mercury');
      const venus = state.choices.find(a => a.id === 'venus');
      expect(mercury.correct).toBe(true);
      expect(venus.correct).toBe(false);
    });

    it('marks multiple correct choices for multi-select', () => {
      const state = parse(CHOICE_MULTI_SELECT_XML, [MULTI_DECL]);
      expect(state.choices.find(a => a.id === 'a').correct).toBe(true);
      expect(state.choices.find(a => a.id === 'b').correct).toBe(false);
      expect(state.choices.find(a => a.id === 'c').correct).toBe(true);
    });

    it('marks all choices as not correct when no declaration provided', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.choices.every(a => !a.correct)).toBe(true);
    });
  });

  describe('graceful fallback', () => {
    it('returns default state for empty bodyXml', () => {
      const state = parse('', []);
      expect(state.choices).toEqual([]);
      expect(state.prompt).toBe('');
    });

    it('returns default state for malformed XML', () => {
      const state = parse('<unclosed', []);
      expect(state.choices).toEqual([]);
    });
  });
});

describe('buildXML()', () => {
  const baseState = {
    prompt: 'Pick one.',
    choices: [
      { id: 'choice_a', content: 'Option A', correct: true, fixed: false },
      { id: 'choice_b', content: 'Option B', correct: false, fixed: false },
    ],
    maxChoices: 1,
    minChoices: 0,
    shuffle: false,
    orientation: 'vertical',
  };

  it('sets cardinality="single" for singleSelect', () => {
    const { declarations } = buildXML(baseState, QuestionType.SINGLE_SELECT);
    expect(declarations[0]).toContain('cardinality="single"');
  });

  it('sets cardinality="multiple" for multiSelect', () => {
    const multiState = {
      ...baseState,
      choices: [
        { id: 'a', content: 'A', correct: true, fixed: false },
        { id: 'b', content: 'B', correct: true, fixed: false },
      ],
      maxChoices: 2,
    };
    const { declarations } = buildXML(multiState, QuestionType.MULTI_SELECT);
    expect(declarations[0]).toContain('cardinality="multiple"');
  });

  it('includes the correct identifier in <qti-value>', () => {
    const { declarations } = buildXML(baseState, QuestionType.SINGLE_SELECT);
    expect(declarations[0]).toContain('choice_a');
    expect(declarations[0]).not.toContain('choice_b');
  });

  it('includes all correct identifiers for multi-select', () => {
    const multiState = {
      ...baseState,
      choices: [
        { id: 'x', content: 'X', correct: true, fixed: false },
        { id: 'y', content: 'Y', correct: true, fixed: false },
        { id: 'z', content: 'Z', correct: false, fixed: false },
      ],
      maxChoices: 2,
    };
    const { declarations } = buildXML(multiState, QuestionType.MULTI_SELECT);
    expect(declarations[0]).toContain('x');
    expect(declarations[0]).toContain('y');
    expect(declarations[0]).not.toContain('z');
  });

  it('omits min-choices attribute when minChoices is 0', () => {
    const { bodyXml } = buildXML(baseState, QuestionType.SINGLE_SELECT);
    expect(bodyXml).not.toContain('min-choices');
  });

  it('includes min-choices attribute when minChoices > 0', () => {
    const { bodyXml } = buildXML({ ...baseState, minChoices: 1 }, QuestionType.SINGLE_SELECT);
    expect(bodyXml).toContain('min-choices');
  });

  it('includes one <qti-simple-choice> per choice', () => {
    const { bodyXml } = buildXML(baseState, QuestionType.SINGLE_SELECT);
    const matches = bodyXml.match(/qti-simple-choice/g) ?? [];
    // Each tag appears as open + close = 2 × 2 choices = 4
    expect(matches.length).toBe(4);
  });

  it('preserves rich markup as XML nodes instead of escaped text', () => {
    const { bodyXml } = buildXML(
      {
        ...baseState,
        prompt: '<p>Pick <strong>one</strong>.</p>',
        choices: [
          {
            id: 'choice_a',
            content: '<p>Option <em>A</em></p>',
            correct: true,
            fixed: false,
          },
          { id: 'choice_b', content: 'Option B', correct: false, fixed: false },
        ],
      },
      QuestionType.SINGLE_SELECT,
    );

    expect(bodyXml).toContain('<strong>one</strong>');
    expect(bodyXml).toContain('<em>A</em>');
    expect(bodyXml).not.toContain('&lt;strong');
    expect(bodyXml).not.toContain('&lt;em');
  });
});

describe('parse → buildXML → parse round-trip', () => {
  it('single-select: re-parsed state matches original', () => {
    const original = parse(CHOICE_SINGLE_SELECT_XML, [SINGLE_DECL]);
    const { bodyXml, declarations } = buildXML(original, QuestionType.SINGLE_SELECT);
    const reparsed = parse(bodyXml, declarations);

    expect(reparsed.maxChoices).toBe(original.maxChoices);
    expect(reparsed.shuffle).toBe(original.shuffle);
    expect(reparsed.orientation).toBe(original.orientation);
    expect(reparsed.choices.map(a => a.id)).toEqual(original.choices.map(a => a.id));
    expect(reparsed.choices.map(a => a.correct)).toEqual(original.choices.map(a => a.correct));
  });

  it('multi-select: re-parsed state matches original', () => {
    const original = parse(CHOICE_MULTI_SELECT_XML, [MULTI_DECL]);
    const { bodyXml, declarations } = buildXML(original, QuestionType.MULTI_SELECT);
    const reparsed = parse(bodyXml, declarations);

    expect(reparsed.choices.filter(a => a.correct).map(a => a.id)).toEqual(
      original.choices.filter(a => a.correct).map(a => a.id),
    );
  });
});
