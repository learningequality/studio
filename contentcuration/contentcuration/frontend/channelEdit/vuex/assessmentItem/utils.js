import { AssessmentItemTypes, ValidationErrors } from '../../constants';

/**
 * Sanitize assesment item answers
 * - trim answers
 * - (optional) remove empty answers
 * @param {Array} answers Assessment item answers
 * @param {Boolean} removeEmpty Remove all empty answers?
 * @returns {Array} Cleaned answers
 */
export const sanitizeAssessmentItemAnswers = (answers, removeEmpty = false) => {
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
};

/**
 * Sanitize assesment item hints
 *  - trim hints
 *  - (optional) remove empty hints
 * @param {Array} hints Assessment item hints
 * @param {Boolean} removeEmpty Remove all empty hints?
 * @returns {Array} Cleaned hints
 */
export const sanitizeAssessmentItemHints = (hints, removeEmpty = false) => {
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
};

/**
 * Sanitize an assesment item
 *  - trim question text
 *  - sanitize answers and hints
 * @param {Array} assessmentItem An assessment item
 * @param {Boolean} removeEmpty Remove empty answers and hints?
 * @returns {Array} Cleaned assessment item
 */
export const sanitizeAssessmentItem = (assessmentItem, removeEmpty = false) => {
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
};

/**
 * Validate an assessment item.
 * @param {Object} assessmentItem An assessment item.
 * @returns {Array} An array of error codes.
 */
export const validateAssessmentItem = assessmentItem => {
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
};

/**
 * Sanitize assessment items
 * - sanitize each assessment item
 * - remove all empty assessment items (an assessment item is considered
 *   empty if there is no question text, no answers and no hints)
 *
 * @param {Array} assessmentItems Assessment items
 * @returns {Array} Sanitized assessment items
 */
export const sanitizeAssessmentItems = assessmentItems => {
  return assessmentItems
    .map(item => sanitizeAssessmentItem(item, true))
    .filter(item => {
      const hasQuestion = item.question.length > 0;
      const hasAnswers = item.answers.length > 0;
      const hasHints = item.hints.length > 0;

      return hasQuestion || hasAnswers || hasHints;
    })
    .map((item, itemIdx) => {
      return {
        ...item,
        order: itemIdx,
      };
    });
};
