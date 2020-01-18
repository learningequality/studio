import _ from 'underscore';
import translator from './translator';
import { AssessmentItemTypes, ValidationErrors } from './constants';
import Constants from 'edit_channel/constants/index';

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
};

/**
 * Updates `correct` fields of answers based on index/indexes stored in `correctAnswersIndices`.
 * @param {Array} answers An array of answer objects { answer: ..., correct: ..., ...}
 * @param {Number|null|Array} correctAnswersIndices A correct answer index or an array
 * of correct answers indexes.
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

export const sanitizeFiles = files => {
  // Remove invalid primary files if a valid primary file exists
  let primaryFiles = _.filter(files, f => !f.preset.supplementary);
  let invalidPrimaryFiles = _.filter(primaryFiles, f => f.error);
  if (invalidPrimaryFiles.length < primaryFiles.length) {
    files = _.reject(files, f => f.error && !f.preset.supplementary);
  }

  // Remove invalid supplementary files
  files = _.reject(files, f => f.error && f.preset.supplementary);
  return files;
};

/**
 * Validate node details - title, licence etc.
 * @param {Object} node A node.
 * @returns {Array} An array of error codes.
 */
export const validateNodeDetails = node => {
  const errors = [];

  // title is required
  if (!node.title) {
    errors.push(ValidationErrors.TITLE_REQUIRED);
  }

  // authoring information is required for resources
  if (!node.freeze_authoring_data && node.kind !== 'topic') {
    const licenseId = node.license && (node.license.id || node.license);
    const license = node.license && Constants.Licenses.find(license => license.id === licenseId);

    if (!license) {
      // license is required
      errors.push(ValidationErrors.LICENCE_REQUIRED);
    } else if (license.copyright_holder_required && !node.copyright_holder) {
      // copyright holder is required for certain licenses
      errors.push(ValidationErrors.COPYRIGHT_HOLDER_REQUIRED);
    } else if (license.is_custom && !node.license_description) {
      // license description is required for certain licenses
      errors.push(ValidationErrors.LICENCE_DESCRIPTION_REQUIRED);
    }
  }

  // mastery is required on exercises
  if (node.kind === 'exercise') {
    const mastery = node.extra_fields;
    if (!mastery || !mastery.mastery_model) {
      errors.push(ValidationErrors.MASTERY_MODEL_REQUIRED);
    } else if (
      mastery.mastery_model === 'm_of_n' &&
      (!mastery.m || !mastery.n || mastery.m > mastery.n)
    ) {
      errors.push(ValidationErrors.MASTERY_MODEL_INVALID);
    }
  }

  return errors;
};

/**
 * Validate node files - correct types, no associated errors, etc.
 * @param {Object} node A node.
 * @returns {Array} An array of error codes.
 */
export const validateNodeFiles = node => {
  const errors = _.chain(node.files)
    .filter(f => f.error)
    .map(f => f.error.type)
    .value();

  return errors;
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

/**
 * Convert a node retrieved from API to a format suitable for any
 * further client-side work:
 * - if node has some assessment items, parse stringified data
 * - make sure that everything is properly sorted by order
 */
export const parseNode = node => {
  if (node.assessment_items && node.assessment_items.length) {
    node.assessment_items = node.assessment_items.map(item => {
      let answers;
      let hints;

      // data can come from API that returns answers and hints as string
      if (typeof item.answers === 'string') {
        answers = JSON.parse(item.answers);
      } else {
        answers = item.answers ? item.answers : [];
      }

      if (typeof item.hints === 'string') {
        hints = JSON.parse(item.hints);
      } else {
        hints = item.hints ? item.hints : [];
      }

      answers.sort((answer1, answer2) => (answer1.order > answer2.order ? 1 : -1));
      hints.sort((hint1, hint2) => (hint1.order > hint2.order ? 1 : -1));

      return {
        ...item,
        answers,
        hints,
      };
    });

    node.assessment_items.sort((item1, item2) => (item1.order > item2.order ? 1 : -1));
  }

  return node;
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
