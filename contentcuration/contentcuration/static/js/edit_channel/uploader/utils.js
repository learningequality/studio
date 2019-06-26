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

/**
 * Update answers to correspond to a question kind:
 * - multiple selection: No answers updates needed.
 * - input question: Make all answers correct.
 * - true/false: Remove answers in favour of new true/false values.
 * - single selection: Keep first correct choice only if there is any.
 *                     Otherwise mark first choice as correct.
 * @param {String} newQuestionKind single/multiple selection, true/false, input question
 * @param {Array} answers An array of answer objects.
 * @returns {Array} An array of updated answer objects.
 */
export const updateAnswersToQuestionKind = (questionKind, answers) => {
  if (!answers || !answers.length) {
    return [];
  }

  let newAnswers = JSON.parse(JSON.stringify(answers));

  switch (questionKind) {
    case AssessmentItemTypes.MULTIPLE_SELECTION:
      break;

    case AssessmentItemTypes.INPUT_QUESTION:
      newAnswers = newAnswers.map(answer => {
        answer.correct = true;
        return answer;
      });
      break;

    case AssessmentItemTypes.TRUE_FALSE:
      newAnswers = [
        { answer: 'True', correct: true, order: 1 },
        { answer: 'False', correct: false, order: 2 },
      ];
      break;

    case AssessmentItemTypes.SINGLE_SELECTION: {
      let firstCorrectAnswerIdx = answers.findIndex(answer => answer.correct === true);
      if (firstCorrectAnswerIdx === -1) {
        firstCorrectAnswerIdx = 0;
      }

      newAnswers = newAnswers.map(answer => {
        answer.correct = false;
        return answer;
      });

      newAnswers[firstCorrectAnswerIdx].correct = true;
      break;
    }
  }

  return newAnswers;
};

/**
 * Insert an item into an array before another item.
 * @param {Array} arr
 * @param {Number} idx An index of an item before which
 *                     a new item will be inserted.
 * @param {*} item A new item to be inserted into an array.
 */
export const insertBefore = (arr, idx, item) => {
  const newArr = JSON.parse(JSON.stringify(arr));
  const insertAt = Math.max(0, idx);
  newArr.splice(insertAt, 0, item);

  return newArr;
};

/**
 * Insert an item into an array after another item.
 * @param {Array} arr
 * @param {Number} idx An index of an item after which
 *                     a new item will be inserted.
 * @param {*} item A new item to be inserted into an array.
 */
export const insertAfter = (arr, idx, item) => {
  const newArr = JSON.parse(JSON.stringify(arr));
  const insertAt = Math.min(arr.length, idx + 1);
  newArr.splice(insertAt, 0, item);

  return newArr;
};
