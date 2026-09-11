import { ref } from 'vue';
import { useTextEntryInteraction } from '../useTextEntryInteraction';
import { QuestionType, ValidationError } from '../../constants';

function makeNumericBlock(answerValues = ['12']) {
  const values = answerValues.map(v => `<qti-value>${v}</qti-value>`).join('');
  const cardinality = answerValues.length > 1 ? 'multiple' : 'single';

  const bodyXml = `<qti-item-body><div><p>What is 3 \xd7 4?</p><p><qti-text-entry-interaction response-identifier="RESPONSE"/></p></div></qti-item-body>`;
  const declaration = `<qti-response-declaration identifier="RESPONSE" cardinality="${cardinality}" base-type="float"><qti-correct-response>${values}</qti-correct-response></qti-response-declaration>`;

  return { bodyXml, responseDeclarations: [declaration] };
}

function makeFreeBlock() {
  const bodyXml = `<qti-item-body><div><p>Describe it.</p><p><qti-text-entry-interaction response-identifier="RESPONSE" expected-length="50"/></p></div></qti-item-body>`;
  const declaration = `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string"/>`;
  return { bodyXml, responseDeclarations: [declaration] };
}

function setupNumeric(answerValues = ['12']) {
  const questionType = ref(QuestionType.NUMERIC);
  return { questionType, ...useTextEntryInteraction(makeNumericBlock(answerValues), questionType) };
}

function setupFree() {
  const questionType = ref(QuestionType.FREE_RESPONSE);
  return { questionType, ...useTextEntryInteraction(makeFreeBlock(), questionType) };
}

describe('useTextEntryInteraction', () => {
  describe('initial state', () => {
    it('parses existing answers from the block', () => {
      const { state } = setupNumeric(['12']);
      expect(state.value.answers).toHaveLength(1);
      expect(state.value.answers[0].value).toBe('12');
    });

    it('starts with no errors when the parsed state is already valid', () => {
      const { errors } = setupNumeric();

      expect(errors.value).toEqual([]);
    });

    it('reports errors for an invalid parsed state without waiting', () => {
      const { errors } = setupNumeric([]);

      expect(errors.value.map(e => e.code)).toContain(ValidationError.NO_CORRECT_ANSWER);
    });
  });

  describe('addAnswer()', () => {
    it('appends a new answer with an "answer_" id and empty value', () => {
      const { state, addAnswer } = setupNumeric(['12']);
      addAnswer();
      expect(state.value.answers).toHaveLength(2);
      const newAnswer = state.value.answers[1];
      expect(newAnswer.id).toMatch(/^answer_/);
      expect(newAnswer.value).toBe('');
    });

    it('each addAnswer call appends a unique id', () => {
      const { state, addAnswer } = setupNumeric();
      addAnswer();
      addAnswer();
      const ids = state.value.answers.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('removeAnswer()', () => {
    it('removes the answer with the given id when 2+ answers exist', () => {
      const { state, removeAnswer } = setupNumeric(['12', '6']);
      // Use parsed ids from state (they are generated slugs, not fixture ids)
      const [first, second] = state.value.answers;
      removeAnswer(first.id);
      expect(state.value.answers).toHaveLength(1);
      expect(state.value.answers[0].id).toBe(second.id);
      expect(state.value.answers[0].value).toBe('6');
    });

    it('is a no-op when only one answer remains', () => {
      const { state, removeAnswer } = setupNumeric(['12']);
      const [first] = state.value.answers;
      removeAnswer(first.id);
      expect(state.value.answers).toHaveLength(1);
    });

    it('is a no-op when the id does not exist', () => {
      const { state, removeAnswer } = setupNumeric(['12', '6']);
      removeAnswer('nonexistent_id');
      expect(state.value.answers).toHaveLength(2);
    });
  });

  describe('updateAnswerValue()', () => {
    it('updates the value for the given id', () => {
      const { state, updateAnswerValue } = setupNumeric(['12']);
      const [first] = state.value.answers;
      updateAnswerValue(first.id, '99');
      expect(state.value.answers[0].value).toBe('99');
    });

    it('does not mutate other answers', () => {
      const { state, updateAnswerValue } = setupNumeric(['12', '6']);
      const [first, second] = state.value.answers;
      updateAnswerValue(first.id, '99');
      expect(state.value.answers[1].id).toBe(second.id);
      expect(state.value.answers[1].value).toBe('6');
    });
  });

  describe('setPrompt()', () => {
    it('updates the prompt field', () => {
      const { state, setPrompt } = setupNumeric();
      setPrompt('<p>New prompt</p>');
      expect(state.value.prompt).toBe('<p>New prompt</p>');
    });
  });

  describe('runValidation()', () => {
    it('populates errors immediately when called explicitly', () => {
      const { errors, runValidation, setPrompt } = setupNumeric();
      setPrompt('');
      runValidation();
      expect(errors.value.some(e => e.code === ValidationError.PROMPT_REQUIRED)).toBe(true);
    });

    it('reports INVALID_NUMERIC_VALUE for a non-numeric answer value', () => {
      const { state, errors, runValidation, updateAnswerValue } = setupNumeric(['12']);
      const [first] = state.value.answers;
      updateAnswerValue(first.id, 'not-a-number');
      runValidation();
      expect(errors.value.some(e => e.code === ValidationError.INVALID_NUMERIC_VALUE)).toBe(true);
    });

    it('returns empty errors for a valid freeResponse state', () => {
      const { errors, runValidation } = setupFree();
      runValidation();
      expect(errors.value).toEqual([]);
    });
  });
});
