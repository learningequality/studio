import translator from './translator';

import { AssessmentItemTypes, AssessmentItemValidationErrors } from './constants';

export const questionShouldHaveOneCorrectAnswer = questionType => {
  return (
    questionType === AssessmentItemTypes.SINGLE_SELECTION ||
    questionType === AssessmentItemTypes.TRUE_FALSE
  );
};

/**
 * Get correct answer index/indices out of an array of answer objects.
 * @param {String} questionType single/multiple selection, true/false, input question
 * @param {Array} answers An array of answer objects { answer: ..., correct: ..., ...}
 * @returns {Number|null|Array} Returns a correct answer index or null for single selection
 * or true/false question. Returns an array of correct answers indices for multiple selection
 * or input question.
 */
export const getCorrectAnswersIndices = (questionType, answers) => {
  if (!questionType || !answers || !answers.length) {
    return null;
  }

  if (questionShouldHaveOneCorrectAnswer(questionType)) {
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
export const updateAnswersToQuestionType = (questionType, answers) => {
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
};

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
 * @param {Object} assessmentItem An assessment item. Should be sanitized first.
 * @returns {Object} { questionErrors, answersErrors } where
 *                   `questionErrors`{Array} Codes of errors related to a question
 *                   `answersErrors` {Array} Codes of errors related to answers
 */
export const validateAssessmentItem = assessmentItem => {
  const questionErrors = [];
  const answersErrors = [];

  const hasOneCorrectAnswer =
    assessmentItem.answers &&
    assessmentItem.answers.filter(answer => answer.correct === true).length === 1;
  const hasAtLeatOneCorrectAnswer =
    assessmentItem.answers &&
    assessmentItem.answers.filter(answer => answer.correct === true).length > 0;

  if (!assessmentItem.question) {
    questionErrors.push(AssessmentItemValidationErrors.BLANK_QUESTION);
  }

  switch (assessmentItem.type) {
    case AssessmentItemTypes.MULTIPLE_SELECTION:
    case AssessmentItemTypes.INPUT_QUESTION:
      if (!hasAtLeatOneCorrectAnswer) {
        answersErrors.push(AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS);
      }
      break;

    case AssessmentItemTypes.TRUE_FALSE:
    case AssessmentItemTypes.SINGLE_SELECTION:
      if (!hasOneCorrectAnswer) {
        answersErrors.push(AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS);
      }
      break;
  }

  return { questionErrors, answersErrors };
};

/**
 * Update assessment draft items `order` fields according to their position in an array.
 * @param {Array} assessmentDraft An assessment draft
 * @returns {Array} Assessment draft with updated `order` fields
 */
export const updateAssessmentDraftOrder = assessmentDraft => {
  return assessmentDraft.map((draftItem, idx) => {
    return {
      ...draftItem,
      data: {
        ...draftItem.data,
        order: idx,
      },
    };
  });
};

/**
 * @param {Object} draftItem Assessment draft item containing validation data
 * @returns Boolean
 */
export const isAssessmentDraftItemValid = draftItem => {
  if (!draftItem.validation) {
    return true;
  }

  return (
    (!draftItem.validation.questionErrors || draftItem.validation.questionErrors.length === 0) &&
    (!draftItem.validation.answersErrors || draftItem.validation.answersErrors.length === 0)
  );
};

/**
 * Sanitize assessment draft items
 * - sanitize each assessment item
 * - remove all empty assessment items (an assessment item is considered
 *   empty if there is no question text, no answers and no hints)
 *
 * @param {Array} assessmentDraft Assessment draft
 * @returns {Array} Assessment draft with sanitized `data`
 */
export const sanitizeAssessmentDraft = assessmentDraft => {
  let newAssessmentDraft = assessmentDraft
    .map(draftItem => {
      return {
        ...draftItem,
        data: sanitizeAssessmentItem(draftItem.data, true),
      };
    })
    .filter(draftItem => {
      const hasQuestion = draftItem.data.question.length > 0;
      const hasAnswers = draftItem.data.answers.length > 0;
      const hasHints = draftItem.data.hints.length > 0;

      return hasQuestion || hasAnswers || hasHints;
    });

  newAssessmentDraft = updateAssessmentDraftOrder(newAssessmentDraft);

  return newAssessmentDraft;
};

/**
 * Validate all assessment draft items and save validation results
 * to `validation` field of each item. Should be applied on sanitized
 * assessment draft.
 * @param {Array} assessmentDraft Assessment draft
 * @returns {Array} Assessment draft with updated `validation` fields
 */
export const validateAssessmentDraft = assessmentDraft => {
  return assessmentDraft.map(draftItem => {
    return {
      ...draftItem,
      validation: validateAssessmentItem(draftItem.data),
    };
  });
};

export const getAssessmentItemErrorMessage = (error, itemType) => {
  switch (error) {
    case AssessmentItemValidationErrors.BLANK_QUESTION:
      return translator.translate('errorBlankQuestion');

    case AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS:
      if (
        itemType === AssessmentItemTypes.SINGLE_SELECTION ||
        itemType === AssessmentItemTypes.TRUE_FALSE
      ) {
        return translator.translate('errorMissingAnswer');
      }

      if (itemType === AssessmentItemTypes.MULTIPLE_SELECTION) {
        return translator.translate('errorChooseAtLeastOneCorrectAnswer');
      }

      if ((itemType = AssessmentItemTypes.INPUT_QUESTION)) {
        return translator.translate('errorProvideAtLeastOneCorrectAnwer');
      }

      break;

    default:
      return null;
  }
};

// TODO @MisRob: Utilities below are not specific to exercise creation.
// Find/create a file higher in the project structure for general stuff.
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

/**
 * Swap two elements of an array
 * @param {Array} arr
 * @param {Number} idx1
 * @param {Number} idx2
 */
export const swapElements = (arr, idx1, idx2) => {
  const newArr = JSON.parse(JSON.stringify(arr));
  [newArr[idx1], newArr[idx2]] = [newArr[idx2], newArr[idx1]];

  return newArr;
};
