import { AssessmentItemTypes, ValidationErrors } from './constants';
import translator from './translator';

/**
 * Sanitize assesment item answers
 * - trim answers
 * - (optional) remove empty answers
 * @param {Array} answers Assessment item answers
 * @param {Boolean} removeEmpty Remove all empty answers?
 * @returns {Array} Cleaned answers
 */
export function sanitizeAssessmentItemAnswers(answers, removeEmpty = false) {
  if (!answers || !answers.length) {
    return [];
  }

  let sanitizedAnswers = answers.map(answer => {
    const answerText = answer.answer ? answer.answer.trim() : '';

    return {
      ...answer,
      answer: answerText,
    };
  });

  if (removeEmpty) {
    sanitizedAnswers = sanitizedAnswers.filter(answer => answer.answer.length > 0);
  }

  sanitizedAnswers = sanitizedAnswers.map((answer, answerIdx) => {
    return {
      ...answer,
      order: answerIdx + 1,
    };
  });

  return sanitizedAnswers;
}

/**
 * Sanitize assesment item hints
 *  - trim hints
 *  - (optional) remove empty hints
 * @param {Array} hints Assessment item hints
 * @param {Boolean} removeEmpty Remove all empty hints?
 * @returns {Array} Cleaned hints
 */
export function sanitizeAssessmentItemHints(hints, removeEmpty = false) {
  if (!hints || !hints.length) {
    return [];
  }

  let sanitizedHints = hints.map(hint => {
    const hintText = hint.hint ? hint.hint.trim() : '';

    return {
      ...hint,
      hint: hintText,
    };
  });

  if (removeEmpty) {
    sanitizedHints = sanitizedHints.filter(hint => hint.hint.length > 0);
  }

  sanitizedHints = sanitizedHints.map((hint, hintIdx) => {
    return {
      ...hint,
      order: hintIdx + 1,
    };
  });

  return sanitizedHints;
}

/**
 * Sanitize an assesment item
 *  - trim question text
 *  - sanitize answers and hints
 * @param {Array} assessmentItem An assessment item
 * @param {Boolean} removeEmpty Remove empty answers and hints?
 * @returns {Array} Cleaned assessment item
 */
export function sanitizeAssessmentItem(assessmentItem, removeEmpty = false) {
  const question = assessmentItem.question ? assessmentItem.question.trim() : '';
  const answers = assessmentItem.answers
    ? sanitizeAssessmentItemAnswers(assessmentItem.answers, removeEmpty)
    : [];
  const hints = assessmentItem.hints
    ? sanitizeAssessmentItemHints(assessmentItem.hints, removeEmpty)
    : [];

  return {
    ...assessmentItem,
    question,
    answers,
    hints,
  };
}

/**
 * Validate an assessment item.
 * @param {Object} assessmentItem An assessment item.
 * @returns {Array} An array of error codes.
 */
export function validateAssessmentItem(assessmentItem) {
  const errors = [];

  const hasOneCorrectAnswer =
    assessmentItem.answers &&
    assessmentItem.answers.filter(
      answer => answer.answer && answer.answer.trim() && answer.correct === true
    ).length === 1;
  const hasAtLeatOneCorrectAnswer =
    assessmentItem.answers &&
    assessmentItem.answers.filter(
      answer => answer.answer && answer.answer.trim() && answer.correct === true
    ).length > 0;

  if (!assessmentItem.question || !assessmentItem.question.trim()) {
    errors.push(ValidationErrors.QUESTION_REQUIRED);
  }

  switch (assessmentItem.type) {
    case AssessmentItemTypes.MULTIPLE_SELECTION:
    case AssessmentItemTypes.INPUT_QUESTION:
      if (!hasAtLeatOneCorrectAnswer) {
        errors.push(ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS);
      }
      break;

    case AssessmentItemTypes.TRUE_FALSE:
    case AssessmentItemTypes.SINGLE_SELECTION:
      if (!hasOneCorrectAnswer) {
        errors.push(ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS);
      }
      break;
  }

  return errors;
}

/**
 * Get correct answer index/indices out of an array of answer objects.
 * @param {String} questionType single/multiple selection, true/false, input question
 * @param {Array} answers An array of answer objects { answer: ..., correct: ..., ...}
 * @returns {Number|null|Array} Returns a correct answer index or null for single selection
 * or true/false question. Returns an array of correct answers indices for multiple selection
 * or input question.
 */
export function getCorrectAnswersIndices(questionType, answers) {
  if (!questionType || !answers || !answers.length) {
    return null;
  }

  if (
    questionType === AssessmentItemTypes.SINGLE_SELECTION ||
    questionType === AssessmentItemTypes.TRUE_FALSE
  ) {
    const idx = answers.findIndex(answer => answer.correct);
    return idx === -1 ? null : idx;
  }

  return answers
    .map((answer, idx) => {
      return answer.correct ? idx : undefined;
    })
    .filter(idx => idx !== undefined);
}

/**
 * Updates `correct` fields of answers based on index/indexes stored in `correctAnswersIndices`.
 * @param {Array} answers An array of answer objects { answer: ..., correct: ..., ...}
 * @param {Number|null|Array} correctAnswersIndices A correct answer index or an array
 * of correct answers indexes.
 * @returns {Array} An array of answer objects with updated `correct` fields.
 */
export function mapCorrectAnswers(answers, correctAnswersIndices) {
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
}

/**
 * Update answers to correspond to a question type:
 * - multiple selection: No answers updates needed.
 * - input question: Make all answers correct.
 * - true/false: Remove answers in favour of new true/false values.
 * - single selection: Keep first correct choice only if there is any.
 *                     Otherwise mark first choice as correct.
 * @param {String} newQuestionType single/multiple selection, true/false, input question
 * @param {Array} answers An array of answer objects.
 * @returns {Array} An array of updated answer objects.
 */
export function updateAnswersToQuestionType(questionType, answers) {
  const NEW_TRUE_FALSE_ANSWERS = [
    { answer: translator.translate('true'), correct: true, order: 1 },
    { answer: translator.translate('false'), correct: false, order: 2 },
  ];

  if (!answers || !answers.length) {
    if (questionType === AssessmentItemTypes.TRUE_FALSE) {
      return NEW_TRUE_FALSE_ANSWERS;
    } else {
      return [];
    }
  }

  let answersCopy = JSON.parse(JSON.stringify(answers));

  switch (questionType) {
    case AssessmentItemTypes.MULTIPLE_SELECTION:
      return answersCopy;

    case AssessmentItemTypes.INPUT_QUESTION:
      return answersCopy.map(answer => {
        answer.correct = true;
        return answer;
      });

    case AssessmentItemTypes.TRUE_FALSE:
      return NEW_TRUE_FALSE_ANSWERS;

    case AssessmentItemTypes.SINGLE_SELECTION: {
      let firstCorrectAnswerIdx = answers.findIndex(answer => answer.correct === true);
      if (firstCorrectAnswerIdx === -1) {
        firstCorrectAnswerIdx = 0;
      }

      const newAnswers = answersCopy.map(answer => {
        answer.correct = false;
        return answer;
      });

      newAnswers[firstCorrectAnswerIdx].correct = true;

      return newAnswers;
    }
  }
}
