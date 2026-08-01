import { ref } from 'vue';
import { useChoiceInteraction } from '../useChoiceInteraction';
import { QuestionType } from '../../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnswer(overrides = {}) {
  return { id: 'choice_a', content: 'A', correct: false, fixed: false, ...overrides };
}

function makeBlock(choices, questionType = QuestionType.SINGLE_SELECT) {
  const maxChoices = questionType === QuestionType.SINGLE_SELECT ? 1 : 2;
  const correctIds = choices.filter(a => a.correct).map(a => a.id);

  const bodyXml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="${maxChoices}">
    ${choices.map(a => `<qti-simple-choice identifier="${a.id}">${a.content}</qti-simple-choice>`).join('\n    ')}
  </qti-choice-interaction>`;

  const declaration = `<qti-response-declaration identifier="RESPONSE"
    cardinality="${questionType === QuestionType.SINGLE_SELECT ? 'single' : 'multiple'}"
    base-type="identifier">
    <qti-correct-response>
      ${correctIds.map(id => `<qti-value>${id}</qti-value>`).join('')}
    </qti-correct-response>
  </qti-response-declaration>`;

  return { bodyXml, responseDeclarations: [declaration] };
}

function setup(choices, questionType = QuestionType.SINGLE_SELECT) {
  const questionTypeRef = ref(questionType);
  const block = makeBlock(choices, questionType);
  return { questionTypeRef, ...useChoiceInteraction(block, questionTypeRef) };
}

describe('useChoiceInteraction', () => {
  describe('addChoice()', () => {
    it('appends a new choice to the list', () => {
      const { state, addChoice } = setup([
        makeAnswer({ id: 'a', content: 'A' }),
        makeAnswer({ id: 'b', content: 'B' }),
      ]);
      addChoice();
      expect(state.value.choices).toHaveLength(3);
    });

    it('new choice has a generated "choice_" identifier', () => {
      const { state, addChoice } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      addChoice();
      const newAnswer = state.value.choices[2];
      expect(newAnswer.id).toMatch(/^choice_[a-z0-9]{8}$/);
    });

    it('new choice has empty content and correct: false', () => {
      const { state, addChoice } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      addChoice();
      const newAnswer = state.value.choices[2];
      expect(newAnswer.content).toBe('');
      expect(newAnswer.correct).toBe(false);
    });
  });

  describe('removeChoice()', () => {
    it('removes the choice with the given id', () => {
      const { state, removeChoice } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      removeChoice('a');
      expect(state.value.choices.find(a => a.id === 'a')).toBeUndefined();
    });

    it('is a no-op when only one choice remains', () => {
      const { state, removeChoice } = setup([makeAnswer({ id: 'a' })]);
      removeChoice('a');
      expect(state.value.choices).toHaveLength(1);
    });
  });

  describe('moveChoiceUp()', () => {
    it('swaps choice with the previous one', () => {
      const { state, moveChoiceUp } = setup([
        makeAnswer({ id: 'a' }),
        makeAnswer({ id: 'b' }),
        makeAnswer({ id: 'c' }),
      ]);
      moveChoiceUp('b');
      expect(state.value.choices.map(a => a.id)).toEqual(['b', 'a', 'c']);
    });

    it('is a no-op when the choice is first', () => {
      const { state, moveChoiceUp } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      moveChoiceUp('a');
      expect(state.value.choices.map(a => a.id)).toEqual(['a', 'b']);
    });
  });

  describe('moveChoiceDown()', () => {
    it('swaps choice with the next one', () => {
      const { state, moveChoiceDown } = setup([
        makeAnswer({ id: 'a' }),
        makeAnswer({ id: 'b' }),
        makeAnswer({ id: 'c' }),
      ]);
      moveChoiceDown('b');
      expect(state.value.choices.map(a => a.id)).toEqual(['a', 'c', 'b']);
    });

    it('is a no-op when the choice is last', () => {
      const { state, moveChoiceDown } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      moveChoiceDown('b');
      expect(state.value.choices.map(a => a.id)).toEqual(['a', 'b']);
    });
  });

  describe('toggleCorrectChoice()', () => {
    it('singleSelect: sets only the target as correct and clears others', () => {
      const { state, toggleCorrectChoice, questionTypeRef } = setup([
        makeAnswer({ id: 'a', correct: true }),
        makeAnswer({ id: 'b', correct: false }),
      ]);
      questionTypeRef.value = QuestionType.SINGLE_SELECT;
      toggleCorrectChoice('b');
      expect(state.value.choices.find(a => a.id === 'b').correct).toBe(true);
      expect(state.value.choices.find(a => a.id === 'a').correct).toBe(false);
    });

    it('multiSelect: toggles only the target, leaves others unchanged', () => {
      const { state, toggleCorrectChoice, questionTypeRef } = setup(
        [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: false })],
        QuestionType.MULTI_SELECT,
      );
      questionTypeRef.value = QuestionType.MULTI_SELECT;
      toggleCorrectChoice('b');
      expect(state.value.choices.find(a => a.id === 'b').correct).toBe(true);
      expect(state.value.choices.find(a => a.id === 'a').correct).toBe(true);
    });

    it('multiSelect: toggles correct off when already correct', () => {
      const { state, toggleCorrectChoice, questionTypeRef } = setup(
        [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: true })],
        QuestionType.MULTI_SELECT,
      );
      questionTypeRef.value = QuestionType.MULTI_SELECT;
      toggleCorrectChoice('a');
      expect(state.value.choices.find(a => a.id === 'a').correct).toBe(false);
      expect(state.value.choices.find(a => a.id === 'b').correct).toBe(true);
    });
  });

  describe('setPrompt()', () => {
    it('updates the prompt field', () => {
      const { state, setPrompt } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      setPrompt('<p>New prompt</p>');
      expect(state.value.prompt).toBe('<p>New prompt</p>');
    });
  });

  describe('setChoiceContent()', () => {
    it('updates content for the target choice only', () => {
      const { state, setChoiceContent } = setup([
        makeAnswer({ id: 'a', content: 'Old' }),
        makeAnswer({ id: 'b', content: 'Unchanged' }),
      ]);
      setChoiceContent('a', 'New content');
      expect(state.value.choices.find(a => a.id === 'a').content).toBe('New content');
      expect(state.value.choices.find(a => a.id === 'b').content).toBe('Unchanged');
    });
  });

  describe('setShuffle()', () => {
    it('updates the shuffle flag', () => {
      const { state, setShuffle } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      setShuffle(true);
      expect(state.value.shuffle).toBe(true);
    });
  });

  describe('showAnswerCount', () => {
    it('defaults to true (maxChoices !== 0 in the fixture)', () => {
      const { state } = setup([
        makeAnswer({ id: 'a', correct: true }),
        makeAnswer({ id: 'b', correct: false }),
      ]);
      expect(state.value.showAnswerCount).toBe(true);
    });

    it('setShowAnswerCount(false) updates state.showAnswerCount', () => {
      const { state, setShowAnswerCount } = setup([
        makeAnswer({ id: 'a', correct: true }),
        makeAnswer({ id: 'b', correct: false }),
      ]);
      setShowAnswerCount(false);
      expect(state.value.showAnswerCount).toBe(false);
    });
  });

  describe('max-choices / min-choices XML output', () => {
    it('when showAnswerCount is true, max-choices equals number of correct answers', () => {
      const { bodyXml } = setup(
        [
          makeAnswer({ id: 'a', correct: true }),
          makeAnswer({ id: 'b', correct: true }),
          makeAnswer({ id: 'c', correct: false }),
        ],
        QuestionType.MULTI_SELECT,
      );

      const parser = new DOMParser();
      const doc = parser.parseFromString(bodyXml.value, 'text/xml');
      const interaction = doc.querySelector('qti-choice-interaction');

      expect(interaction?.getAttribute('max-choices')).toBe('2');
    });

    it('when showAnswerCount is false, max-choices is 0', () => {
      const { bodyXml, setShowAnswerCount } = setup(
        [
          makeAnswer({ id: 'a', correct: true }),
          makeAnswer({ id: 'b', correct: true }),
          makeAnswer({ id: 'c', correct: false }),
        ],
        QuestionType.MULTI_SELECT,
      );

      setShowAnswerCount(false);

      const parser = new DOMParser();
      const doc = parser.parseFromString(bodyXml.value, 'text/xml');
      const interaction = doc.querySelector('qti-choice-interaction');

      expect(interaction?.getAttribute('max-choices')).toBe('0');
    });

    it('updates automatically when correct answers change and showAnswerCount is true', () => {
      const { bodyXml, toggleCorrectChoice } = setup(
        [
          makeAnswer({ id: 'a', correct: true }),
          makeAnswer({ id: 'b', correct: false }),
          makeAnswer({ id: 'c', correct: false }),
        ],
        QuestionType.MULTI_SELECT,
      );

      // Initially 1 correct answer
      let parser = new DOMParser();
      let doc = parser.parseFromString(bodyXml.value, 'text/xml');
      let interaction = doc.querySelector('qti-choice-interaction');
      expect(interaction?.getAttribute('max-choices')).toBe('1');
      expect(interaction?.getAttribute('min-choices')).toBe('1');

      // Toggle second answer correct
      toggleCorrectChoice('b');

      parser = new DOMParser();
      doc = parser.parseFromString(bodyXml.value, 'text/xml');
      interaction = doc.querySelector('qti-choice-interaction');
      expect(interaction?.getAttribute('max-choices')).toBe('2');
      expect(interaction?.getAttribute('min-choices')).toBe('2');
    });

    it('sets max-choices to 1 and omits min-choices for single select', () => {
      const { bodyXml } = setup(
        [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: false })],
        QuestionType.SINGLE_SELECT,
      );

      const parser = new DOMParser();
      const doc = parser.parseFromString(bodyXml.value, 'text/xml');
      const interaction = doc.querySelector('qti-choice-interaction');
      expect(interaction?.getAttribute('max-choices')).toBe('1');
      expect(interaction?.hasAttribute('min-choices')).toBe(false);
    });
  });

  describe('questionType conversion', () => {
    it('updates response declaration cardinality to match the new type', () => {
      const { questionTypeRef, responseDeclarations } = setup(
        [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: false })],
        QuestionType.SINGLE_SELECT,
      );

      // Verify initial state
      let parser = new DOMParser();
      let doc = parser.parseFromString(responseDeclarations.value[0], 'text/xml');
      let declaration = doc.querySelector('qti-response-declaration');
      expect(declaration?.getAttribute('cardinality')).toBe('single');

      // Change type to multi-select
      questionTypeRef.value = QuestionType.MULTI_SELECT;

      // Verify updated state
      parser = new DOMParser();
      doc = parser.parseFromString(responseDeclarations.value[0], 'text/xml');
      declaration = doc.querySelector('qti-response-declaration');
      expect(declaration?.getAttribute('cardinality')).toBe('multiple');
    });
  });
});
