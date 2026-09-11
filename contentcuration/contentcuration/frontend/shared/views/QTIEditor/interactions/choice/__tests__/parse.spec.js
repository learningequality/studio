/* eslint-disable jest-dom/prefer-to-have-attribute, jest-dom/prefer-to-have-text-content */
// The eslint-dom matchers reject XML nodes produced by DOMParser(..., 'text/xml').
// Native DOM APIs (getAttribute, textContent) work correctly on XML elements.

import { choiceInteractionDescriptor } from '../Descriptor';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  CHOICE_NO_PROMPT_XML,
  CHOICE_SINGLE_DECL_XML as SINGLE_DECL,
  CHOICE_MULTI_DECL_XML as MULTI_DECL,
} from '../../../utils/testingFixtures';
import { QuestionType, Orientation } from '../../../constants';

const parse = choiceInteractionDescriptor.parse.bind(choiceInteractionDescriptor);
const buildXML = choiceInteractionDescriptor.buildXML.bind(choiceInteractionDescriptor);

describe('parse()', () => {
  describe('attribute defaults', () => {
    it('defaults showAnswerCount to true when max-choices attribute is absent', () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-choice-interaction>`;
      const state = parse(xml, []);
      expect(state.showAnswerCount).toBe(true);
    });

    it('defaults shuffle to false when attribute is absent', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.shuffle).toBe(false);
    });

    it('defaults orientation to Orientation.VERTICAL when attribute is absent', () => {
      const state = parse(CHOICE_SINGLE_SELECT_XML, []);
      expect(state.orientation).toBe(Orientation.VERTICAL);
    });

    it('defaults prompt to empty string when <qti-prompt> is absent', () => {
      const state = parse(CHOICE_NO_PROMPT_XML, []);
      expect(state.prompt).toBe('');
    });
  });

  describe('attribute reading', () => {
    it('sets showAnswerCount to false when max-choices="0"', () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="0">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-choice-interaction>`;
      const state = parse(xml, []);
      expect(state.showAnswerCount).toBe(false);
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
      expect(state.choices).toHaveLength(1);
      expect(state.choices[0].content).toBe('');
      expect(state.choices[0].correct).toBe(false);
      expect(state.prompt).toBe('');
      expect(state.showAnswerCount).toBe(true);
    });

    it('returns default state for malformed XML', () => {
      const state = parse('<unclosed', []);
      expect(state.choices).toHaveLength(1);
    });
  });

  describe('showAnswerCount', () => {
    it('parses max-choices="0" as showAnswerCount = false', () => {
      const xml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="0">
        <qti-simple-choice identifier="a">A</qti-simple-choice>
      </qti-choice-interaction>`;
      const state = parse(xml, []);
      expect(state.showAnswerCount).toBe(false);
    });
  });
});

describe('buildXML()', () => {
  function parseXmlString(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const err = doc.querySelector('parsererror');
    if (err) throw new Error(`Invalid XML: ${err.textContent}`);
    return doc.documentElement;
  }

  const baseState = {
    prompt: 'Pick one.',
    choices: [
      { id: 'choice_a', content: 'Option A', correct: true, fixed: false },
      { id: 'choice_b', content: 'Option B', correct: false, fixed: false },
    ],
    showAnswerCount: true,
    shuffle: false,
    orientation: Orientation.VERTICAL,
  };

  describe('response declaration XML', () => {
    it('sets cardinality="single" on the declaration element for singleSelect', () => {
      const { responseDeclarations } = buildXML(baseState, QuestionType.SINGLE_SELECT);
      const decl = parseXmlString(responseDeclarations[0]);
      expect(decl.getAttribute('cardinality')).toBe('single');
    });

    it('sets cardinality="multiple" on the declaration element for multiSelect', () => {
      const multiState = {
        ...baseState,
        choices: [
          { id: 'a', content: 'A', correct: true, fixed: false },
          { id: 'b', content: 'B', correct: true, fixed: false },
        ],
      };
      const { responseDeclarations } = buildXML(multiState, QuestionType.MULTI_SELECT);
      const decl = parseXmlString(responseDeclarations[0]);
      expect(decl.getAttribute('cardinality')).toBe('multiple');
    });

    it('sets base-type="identifier" on the declaration element', () => {
      const { responseDeclarations } = buildXML(baseState, QuestionType.SINGLE_SELECT);
      const decl = parseXmlString(responseDeclarations[0]);
      expect(decl.getAttribute('base-type')).toBe('identifier');
    });

    it('includes only correct choice identifiers in <qti-value> elements', () => {
      const { responseDeclarations } = buildXML(baseState, QuestionType.SINGLE_SELECT);
      const decl = parseXmlString(responseDeclarations[0]);
      const values = [...decl.querySelectorAll('qti-value')].map(n => n.textContent.trim());
      expect(values).toContain('choice_a');
      expect(values).not.toContain('choice_b');
    });

    it('includes all correct identifiers in <qti-value> elements for multi-select', () => {
      const multiState = {
        ...baseState,
        choices: [
          { id: 'x', content: 'X', correct: true, fixed: false },
          { id: 'y', content: 'Y', correct: true, fixed: false },
          { id: 'z', content: 'Z', correct: false, fixed: false },
        ],
      };
      const { responseDeclarations } = buildXML(multiState, QuestionType.MULTI_SELECT);
      const decl = parseXmlString(responseDeclarations[0]);
      const values = [...decl.querySelectorAll('qti-value')].map(n => n.textContent.trim());
      expect(values).toContain('x');
      expect(values).toContain('y');
      expect(values).not.toContain('z');
    });
  });

  describe('body XML', () => {
    it('omits min-choices attribute for single-select (spec: only multi-select uses min-choices)', () => {
      const { bodyXml } = buildXML(baseState, QuestionType.SINGLE_SELECT);
      const root = parseXmlString(bodyXml);
      expect(root.getAttribute('min-choices')).toBeNull();
    });

    it('sets min-choices attribute for multi-select when showAnswerCount is true', () => {
      const multiState = {
        ...baseState,
        choices: [
          { id: 'choice_a', content: 'Option A', correct: true, fixed: false },
          { id: 'choice_b', content: 'Option B', correct: false, fixed: false },
        ],
        showAnswerCount: true,
      };
      const { bodyXml } = buildXML(multiState, QuestionType.MULTI_SELECT);
      const root = parseXmlString(bodyXml);
      expect(root.getAttribute('min-choices')).toBe('1');
    });

    it('sets max-choices to 1 for single-select regardless of correct count', () => {
      const { bodyXml } = buildXML(baseState, QuestionType.SINGLE_SELECT);
      const root = parseXmlString(bodyXml);
      expect(root.getAttribute('max-choices')).toBe('1');
    });

    it('emits explicit max-choices="0" for multi-select + showAnswerCount + zero correct answers', () => {
      const noCorrectState = {
        ...baseState,
        choices: [
          { id: 'choice_a', content: 'Option A', correct: false, fixed: false },
          { id: 'choice_b', content: 'Option B', correct: false, fixed: false },
        ],
        showAnswerCount: true,
      };
      const { bodyXml } = buildXML(noCorrectState, QuestionType.MULTI_SELECT);
      const root = parseXmlString(bodyXml);
      expect(root.getAttribute('max-choices')).toBe('0');
    });

    it('renders one <qti-simple-choice> per choice with the correct identifier', () => {
      const { bodyXml } = buildXML(baseState, QuestionType.SINGLE_SELECT);
      const root = parseXmlString(bodyXml);
      const simpleChoices = root.querySelectorAll('qti-simple-choice');
      expect(simpleChoices).toHaveLength(2);
      expect(simpleChoices[0].getAttribute('identifier')).toBe('choice_a');
      expect(simpleChoices[1].getAttribute('identifier')).toBe('choice_b');
    });

    it('preserves rich markup as real XML child nodes, not escaped text', () => {
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

      const root = parseXmlString(bodyXml);
      expect(root.querySelector('strong')).not.toBeNull();
      expect(root.querySelector('em')).not.toBeNull();
      expect(root.querySelector('strong').textContent).toBe('one');
      expect(root.querySelector('em').textContent).toBe('A');
    });
  });
});

describe('parse → buildXML → parse round-trip', () => {
  it('single-select: re-parsed state matches original', () => {
    const original = parse(CHOICE_SINGLE_SELECT_XML, [SINGLE_DECL]);
    const { bodyXml, responseDeclarations } = buildXML(original, QuestionType.SINGLE_SELECT);
    const reparsed = parse(bodyXml, responseDeclarations);

    expect(reparsed.showAnswerCount).toBe(original.showAnswerCount);
    expect(reparsed.shuffle).toBe(original.shuffle);
    expect(reparsed.orientation).toBe(original.orientation);
    expect(reparsed.choices.map(a => a.id)).toEqual(original.choices.map(a => a.id));
    expect(reparsed.choices.map(a => a.correct)).toEqual(original.choices.map(a => a.correct));
  });

  it('multi-select: re-parsed state matches original', () => {
    const original = parse(CHOICE_MULTI_SELECT_XML, [MULTI_DECL]);
    const { bodyXml, responseDeclarations } = buildXML(original, QuestionType.MULTI_SELECT);
    const reparsed = parse(bodyXml, responseDeclarations);

    expect(reparsed.choices.filter(a => a.correct).map(a => a.id)).toEqual(
      original.choices.filter(a => a.correct).map(a => a.id),
    );
  });
});
