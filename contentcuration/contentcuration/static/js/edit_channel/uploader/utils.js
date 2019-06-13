import { AssessmentItemTypes } from './constants';

export const questionHasOneCorrectAnswer = questionKind => {
  return (
    questionKind === AssessmentItemTypes.SINGLE_SELECTION ||
    questionKind === AssessmentItemTypes.TRUE_FALSE
  );
};

/**
 * Get correct answer index/indices out of an array of answer objects.
 * @param {Array} answers An array of answer objects { answer: ..., correct: ..., ...}
 * @param {String} questionKind single/multiple selection, true/false, input question
 * @returns {Number|null|Array} Returns a correct answer index or null for single selection
 * or true/false question. Returns an array of correct answers indices for multiple selection
 * or input question.
 */
export const getCorrectAnswersIndices = (questionKind, answers) => {
  if (!questionKind || !answers || !answers.length) {
    return null;
  }

  if (questionHasOneCorrectAnswer(questionKind)) {
    const idx = answers.findIndex(answer => answer.correct);
    return idx === -1 ? null : idx;
  }

  return answers
    .map((answer, idx) => {
      return answer.correct ? idx : undefined;
    })
    .filter(idx => idx !== undefined);
};

/**
 * Updates `correct` fields of answers based on index/indexes stored in `correctAnswersIndice`.
 * @param {Array} answers An array of answer objects { answer: ..., correct: ..., ...}
 * @param {Number|null|Array} correctAnswersIndices A correct answer index or an array of
 * correct answers indexes.
 * @returns {Array} An array of answer objects with updated `correct` fields.
 */
export const mapCorrectAnswers = (answers, correctAnswersIndices) => {
  if (!answers || !answers.length) {
    return null;
  }

  return answers.map((answer, idx) => {
    const isAnswerCorrect =
      correctAnswersIndices === idx ||
      (Array.isArray(correctAnswersIndices) && correctAnswersIndices.includes(idx));

    return {
      ...answer,
      correct: isAnswerCorrect,
    };
  });
};
