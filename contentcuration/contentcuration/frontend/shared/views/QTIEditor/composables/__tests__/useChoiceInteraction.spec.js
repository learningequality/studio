import { ref } from 'vue';
import { useChoiceInteraction } from '../useChoiceInteraction';
import { QuestionType } from '../../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnswer(overrides = {}) {
  return { id: 'choice_a', content: 'A', correct: false, fixed: false, ...overrides };
}

function makeBlock(answers, questionType = QuestionType.SINGLE_SELECT) {
  const maxChoices = questionType === QuestionType.SINGLE_SELECT ? 1 : 2;
  const correctIds = answers.filter(a => a.correct).map(a => a.id);

  const bodyXml = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="${maxChoices}">
    ${answers.map(a => `<qti-simple-choice identifier="${a.id}">${a.content}</qti-simple-choice>`).join('\n    ')}
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

function setup(answers, questionType = QuestionType.SINGLE_SELECT) {
  const qt = ref(questionType);
  const block = makeBlock(answers, questionType);
  return { qt, ...useChoiceInteraction(block, qt) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useChoiceInteraction', () => {
  describe('addChoice()', () => {
    it('appends a new answer to the list', () => {
      const { state, addChoice } = setup([
        makeAnswer({ id: 'a', content: 'A' }),
        makeAnswer({ id: 'b', content: 'B' }),
      ]);
      addChoice();
      expect(state.value.answers).toHaveLength(3);
    });

    it('new answer has a generated "choice_" identifier', () => {
      const { state, addChoice } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      addChoice();
      const newAnswer = state.value.answers[2];
      expect(newAnswer.id).toMatch(/^choice_[a-z0-9]{8}$/);
    });

    it('new answer has empty content and correct: false', () => {
      const { state, addChoice } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      addChoice();
      const newAnswer = state.value.answers[2];
      expect(newAnswer.content).toBe('');
      expect(newAnswer.correct).toBe(false);
    });
  });

  describe('removeChoice()', () => {
    it('removes the answer with the given id', () => {
      const { state, removeChoice } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      removeChoice('a');
      expect(state.value.answers.find(a => a.id === 'a')).toBeUndefined();
    });

    it('is a no-op when only one answer remains', () => {
      const { state, removeChoice } = setup([makeAnswer({ id: 'a' })]);
      removeChoice('a');
      expect(state.value.answers).toHaveLength(1);
    });
  });

  describe('moveChoiceUp()', () => {
    it('swaps answer with the previous one', () => {
      const { state, moveChoiceUp } = setup([
        makeAnswer({ id: 'a' }),
        makeAnswer({ id: 'b' }),
        makeAnswer({ id: 'c' }),
      ]);
      moveChoiceUp('b');
      expect(state.value.answers.map(a => a.id)).toEqual(['b', 'a', 'c']);
    });

    it('is a no-op when the answer is first', () => {
      const { state, moveChoiceUp } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      moveChoiceUp('a');
      expect(state.value.answers.map(a => a.id)).toEqual(['a', 'b']);
    });
  });

  describe('moveChoiceDown()', () => {
    it('swaps answer with the next one', () => {
      const { state, moveChoiceDown } = setup([
        makeAnswer({ id: 'a' }),
        makeAnswer({ id: 'b' }),
        makeAnswer({ id: 'c' }),
      ]);
      moveChoiceDown('b');
      expect(state.value.answers.map(a => a.id)).toEqual(['a', 'c', 'b']);
    });

    it('is a no-op when the answer is last', () => {
      const { state, moveChoiceDown } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      moveChoiceDown('b');
      expect(state.value.answers.map(a => a.id)).toEqual(['a', 'b']);
    });
  });

  describe('toggleCorrectChoice()', () => {
    it('singleSelect: sets only the target as correct and clears others', () => {
      const { state, toggleCorrectChoice, qt } = setup([
        makeAnswer({ id: 'a', correct: true }),
        makeAnswer({ id: 'b', correct: false }),
      ]);
      qt.value = QuestionType.SINGLE_SELECT;
      toggleCorrectChoice('b');
      expect(state.value.answers.find(a => a.id === 'b').correct).toBe(true);
      expect(state.value.answers.find(a => a.id === 'a').correct).toBe(false);
    });

    it('multiSelect: toggles only the target, leaves others unchanged', () => {
      const { state, toggleCorrectChoice, qt } = setup(
        [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: false })],
        QuestionType.MULTI_SELECT,
      );
      qt.value = QuestionType.MULTI_SELECT;
      toggleCorrectChoice('b');
      expect(state.value.answers.find(a => a.id === 'b').correct).toBe(true);
      expect(state.value.answers.find(a => a.id === 'a').correct).toBe(true);
    });

    it('multiSelect: toggles correct off when already correct', () => {
      const { state, toggleCorrectChoice, qt } = setup(
        [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: true })],
        QuestionType.MULTI_SELECT,
      );
      qt.value = QuestionType.MULTI_SELECT;
      toggleCorrectChoice('a');
      expect(state.value.answers.find(a => a.id === 'a').correct).toBe(false);
      expect(state.value.answers.find(a => a.id === 'b').correct).toBe(true);
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
    it('updates content for the target answer only', () => {
      const { state, setChoiceContent } = setup([
        makeAnswer({ id: 'a', content: 'Old' }),
        makeAnswer({ id: 'b', content: 'Unchanged' }),
      ]);
      setChoiceContent('a', 'New content');
      expect(state.value.answers.find(a => a.id === 'a').content).toBe('New content');
      expect(state.value.answers.find(a => a.id === 'b').content).toBe('Unchanged');
    });
  });

  describe('setShuffle()', () => {
    it('updates the shuffle flag', () => {
      const { state, setShuffle } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      setShuffle(true);
      expect(state.value.shuffle).toBe(true);
    });
  });

  describe('setOrientation()', () => {
    it('updates the orientation field', () => {
      const { state, setOrientation } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      setOrientation('horizontal');
      expect(state.value.orientation).toBe('horizontal');
    });
  });

  describe('setMaxChoices()', () => {
    it('updates the maxChoices field', () => {
      const { state, setMaxChoices } = setup([makeAnswer({ id: 'a' }), makeAnswer({ id: 'b' })]);
      setMaxChoices(3);
      expect(state.value.maxChoices).toBe(3);
    });
  });
});
