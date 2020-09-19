import { AssessmentItemTypes, ValidationErrors } from './constants';
import translator from './translator';
import Licenses from 'shared/leUtils/Licenses';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';

// TODO: Move to shared
/*
 * Common
 * ------
 * Title is required
 * Authoring information is required for resources:
 *   License is required
 *   Copyright holder is required for non-public domain licenses
 *   License description is required on special permissions licenses
 *
 * Exercise
 * --------
 * Mastery model is required
 * Exercise with mastery model M of N must have valid M set
 * Exercise with mastery model M of N must have valid N set
 * It must have at least one question
 * A question must have right answers
 */

// Private helpers
function _getLicense(node) {
  return node.license && Licenses.get(node.license.id || node.license);
}

function _getMasteryModel(node) {
  return node.extra_fields;
}

function _getErrorMsg(error) {
  const messages = {
    [ValidationErrors.TITLE_REQUIRED]: translator.$tr('titleRequired'),
    [ValidationErrors.LICENSE_REQUIRED]: translator.$tr('licenseRequired'),
    [ValidationErrors.COPYRIGHT_HOLDER_REQUIRED]: translator.$tr('copyrightHolderRequired'),
    [ValidationErrors.LICENSE_DESCRIPTION_REQUIRED]: translator.$tr('licenseDescriptionRequired'),
    [ValidationErrors.MASTERY_MODEL_REQUIRED]: translator.$tr('masteryModelRequired'),
    [ValidationErrors.MASTERY_MODEL_M_REQUIRED]: translator.$tr('masteryModelMRequired'),
    [ValidationErrors.MASTERY_MODEL_M_WHOLE_NUMBER]: translator.$tr('masteryModelMWholeNumber'),
    [ValidationErrors.MASTERY_MODEL_M_GT_ZERO]: translator.$tr('masteryModelMGtZero'),
    [ValidationErrors.MASTERY_MODEL_M_LTE_N]: translator.$tr('masteryModelMLteN'),
    [ValidationErrors.MASTERY_MODEL_N_REQUIRED]: translator.$tr('masteryModelNRequired'),
    [ValidationErrors.MASTERY_MODEL_N_WHOLE_NUMBER]: translator.$tr('masteryModelNWholeNumber'),
    [ValidationErrors.MASTERY_MODEL_N_GT_ZERO]: translator.$tr('masteryModelNGtZero'),
  };

  return messages[error];
}

// Helpers
export function translateValidator(validator) {
  return value => (validator(value) === true ? true : _getErrorMsg(validator(value)));
}

// Validators
// These functions return an array of validators (validator is
// a function that returns `true` or an error code)
// Designed to be compatible with Vuetify's inputs rules
export function getTitleValidators() {
  return [value => Boolean(value) || ValidationErrors.TITLE_REQUIRED];
}

export function getLicenseValidators() {
  return [value => Boolean(value) || ValidationErrors.LICENSE_REQUIRED];
}

export function getCopyrightHolderValidators() {
  return [value => Boolean(value) || ValidationErrors.COPYRIGHT_HOLDER_REQUIRED];
}

export function getLicenseDescriptionValidators() {
  return [value => Boolean(value) || ValidationErrors.LICENSE_DESCRIPTION_REQUIRED];
}

export function getMasteryModelValidators() {
  return [value => Boolean(value) || ValidationErrors.MASTERY_MODEL_REQUIRED];
}

export function getMasteryModelMValidators(nValue) {
  return [
    value => Boolean(value) || ValidationErrors.MASTERY_MODEL_M_REQUIRED,
    value => Number.isInteger(Number(value)) || ValidationErrors.MASTERY_MODEL_M_WHOLE_NUMBER,
    value => value > 0 || ValidationErrors.MASTERY_MODEL_M_GT_ZERO,
    value => value <= nValue || ValidationErrors.MASTERY_MODEL_M_LTE_N,
  ];
}

export function getMasteryModelNValidators() {
  return [
    value => Boolean(value) || ValidationErrors.MASTERY_MODEL_N_REQUIRED,
    value => Number.isInteger(Number(value)) || ValidationErrors.MASTERY_MODEL_N_WHOLE_NUMBER,
    value => value > 0 || ValidationErrors.MASTERY_MODEL_N_GT_ZERO,
  ];
}

// Node validation
// These functions return an array of error codes
export function validateNodeTitle(node) {
  return getTitleValidators()
    .map(validator => validator(node.title))
    .filter(value => value !== true);
}

export function validateNodeLicense(node) {
  const license = _getLicense(node);
  return getLicenseValidators()
    .map(validator => validator(license))
    .filter(value => value !== true);
}

export function validateNodeCopyrightHolder(node) {
  const license = _getLicense(node);
  if (!license || !license.copyright_holder_required) {
    return [];
  }
  return getCopyrightHolderValidators()
    .map(validator => validator(node.copyright_holder))
    .filter(value => value !== true);
}

export function validateNodeLicenseDescription(node) {
  const license = _getLicense(node);
  if (!license || !license.is_custom) {
    return [];
  }
  return getLicenseDescriptionValidators()
    .map(validator => validator(node.license_description))
    .filter(value => value !== true);
}

export function validateNodeMasteryModel(node) {
  const mastery = _getMasteryModel(node);
  return getMasteryModelValidators()
    .map(validator => validator(mastery))
    .filter(value => value !== true);
}

export function validateNodeMasteryModelM(node) {
  const mastery = _getMasteryModel(node);
  if (!mastery || mastery.type !== MasteryModelsNames.M_OF_N) {
    return [];
  }
  return getMasteryModelMValidators(mastery.n)
    .map(validator => validator(mastery.m))
    .filter(value => value !== true);
}

export function validateNodeMasteryModelN(node) {
  const mastery = _getMasteryModel(node);
  if (!mastery || mastery.type !== MasteryModelsNames.M_OF_N) {
    return [];
  }
  return getMasteryModelNValidators()
    .map(validator => validator(mastery.n))
    .filter(value => value !== true);
}

/**
 * @param  {Object} nodeDetails Node data like title, license, ...
 * @param  {Array} assessmentItems An array of the node's assessment items
 *                                 (for exercise nodes)
 * @return {Boolean} Returns `true` if node details (and assessment items for exercises) are valid.
 *                   Returns `false` otherwise.
 */
export function isNodeComplete(nodeDetails, assessmentItems = []) {
  if (validateNodeDetails(nodeDetails).length) {
    return false;
  }

  if (nodeDetails.kind === ContentKindsNames.EXERCISE) {
    if (!assessmentItems || !assessmentItems.length) {
      return false;
    }

    const isInvalid = assessmentItem => {
      const sanitizedAssessmentItem = sanitizeAssessmentItem(assessmentItem, true);
      return validateAssessmentItem(sanitizedAssessmentItem).length;
    };
    if (assessmentItems.some(isInvalid)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate node details - title, license etc.
 * @param {Object} node A node.
 * @returns {Array} An array of error codes.
 */
export function validateNodeDetails(node) {
  let errors = [];

  const titleErrors = validateNodeTitle(node);
  if (titleErrors.length) {
    errors = errors.concat(titleErrors);
  }

  // authoring information is required for resources
  if (!node.freeze_authoring_data && node.kind !== ContentKindsNames.TOPIC) {
    const licenseErrors = validateNodeLicense(node);
    const copyrightHolderErrors = validateNodeCopyrightHolder(node);
    const licenseDescriptionErrors = validateNodeLicenseDescription(node);

    if (licenseErrors.length) {
      errors = errors.concat(licenseErrors);
    }
    if (copyrightHolderErrors.length) {
      errors = errors.concat(copyrightHolderErrors);
    }
    if (licenseDescriptionErrors.length) {
      errors = errors.concat(licenseDescriptionErrors);
    }
  }

  // mastery is required on exercises
  if (node.kind === ContentKindsNames.EXERCISE) {
    const masteryModelErrors = validateNodeMasteryModel(node);
    const masteryModelMErrors = validateNodeMasteryModelM(node);
    const masteryModelNErrors = validateNodeMasteryModelN(node);

    if (masteryModelErrors.length) {
      errors = errors.concat(masteryModelErrors);
    }
    if (masteryModelMErrors.length) {
      errors = errors.concat(masteryModelMErrors);
    }
    if (masteryModelNErrors.length) {
      errors = errors.concat(masteryModelNErrors);
    }
  }

  return errors;
}

/**
 * Validate node files - correct types, no associated errors, etc.
 * @param {Array} files An array of files for a node.
 * @returns {Array} An array of error codes.
 */
export function validateNodeFiles(files) {
  let errors = files.filter(f => f.error).map(f => f.error);
  let validPrimaryFiles = files.filter(f => !f.error && !f.preset.supplementary);

  if (!validPrimaryFiles.length) {
    errors.push(ValidationErrors.NO_VALID_PRIMARY_FILES);
  }
  return errors;
}

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

  // Don't validate perseus questions
  if (assessmentItem.type === AssessmentItemTypes.PERSEUS_QUESTION) {
    return errors;
  }
  // Convert answers to string to handle numeric responses
  const hasOneCorrectAnswer =
    assessmentItem.answers &&
    assessmentItem.answers.filter(
      answer => answer.answer && String(answer.answer).trim() && answer.correct === true
    ).length === 1;
  const hasAtLeatOneCorrectAnswer =
    assessmentItem.answers &&
    assessmentItem.answers.filter(
      answer => answer.answer && String(answer.answer).trim() && answer.correct === true
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
    { answer: translator.$tr('true'), correct: true, order: 1 },
    { answer: translator.$tr('false'), correct: false, order: 2 },
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
