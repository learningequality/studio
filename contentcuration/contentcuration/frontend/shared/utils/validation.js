import get from 'lodash/get';
import CompletionCriteriaModels from 'kolibri-constants/CompletionCriteria';
import translator from '../translator';
import { AssessmentItemTypes, ValidationErrors, ContentModalities } from '../constants';
import { validateQtiItem } from 'shared/views/QTIEditor/validateItem';
import Licenses from 'shared/leUtils/Licenses';
import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { validate as validateCompletionCriteria } from 'shared/leUtils/CompletionCriteria';

/**
 * Topic and resource
 * ------------------
 * Title is required
 *
 * Resource
 * --------
 * Authoring information is required:
 *   License is required
 *   Copyright holder is required for non-public domain licenses
 *   License description is required on special permissions licenses
 *
 * Resource other than exercise
 * ----------------------------
 * All files need to be valid
 * Must have a primary file
 *
 * Exercise
 * --------
 * Mastery model is required
 * Exercise with mastery model M of N must have valid M set
 * Exercise with mastery model M of N must have valid N set
 * It must have at least one question
 * A question must have right answers
 *
 * Non-topics
 * ----------
 * Completion criteria is validated to ensure it conforms to the schema
 *   and is valid for the content kind
 */
export function isNodeComplete({ nodeDetails, assessmentItems, files }) {
  if (!nodeDetails) {
    throw ReferenceError('node details must be defined');
  }
  if (
    nodeDetails.kind !== ContentKindsNames.TOPIC &&
    nodeDetails.kind !== ContentKindsNames.EXERCISE &&
    !files
  ) {
    throw ReferenceError('files must be defined for a node other than topic or exercise');
  }
  if (nodeDetails.kind === ContentKindsNames.EXERCISE && !assessmentItems) {
    throw ReferenceError('assessment items must be defined for exercises');
  }

  if (getNodeDetailsErrors(nodeDetails).length) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.info('Node is incomplete', getNodeDetailsErrors(nodeDetails));
    }
    return false;
  }
  if (
    nodeDetails.kind !== ContentKindsNames.TOPIC &&
    nodeDetails.kind !== ContentKindsNames.EXERCISE
  ) {
    if (getNodeFilesErrors(files).length) {
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.info("Node's files are incomplete", getNodeFilesErrors(files));
      }
      return false;
    }
  }
  if (nodeDetails.kind !== ContentKindsNames.TOPIC) {
    const completionCriteria = get(nodeDetails, 'extra_fields.options.completion_criteria');
    if (completionCriteria && !validateCompletionCriteria(completionCriteria, nodeDetails.kind)) {
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.info("Node's completion criteria is invalid", validateCompletionCriteria.errors);
      }
      return false;
    }
  }
  if (nodeDetails.kind === ContentKindsNames.EXERCISE) {
    if (!assessmentItems.length) {
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.info('Exercise node is missing assessment items');
      }
      return false;
    }

    const isInvalid = assessmentItem => getAssessmentItemErrors(assessmentItem).length;
    if (assessmentItems.some(isInvalid)) {
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.info(
          "Exercise node's assessment items are invalid",
          assessmentItems.some(isInvalid),
        );
      }
      return false;
    }
  }

  return true;
}

// Private helpers
function _isPracticeQuiz(node) {
  return get(node, 'extra_fields.options.modality') === ContentModalities.QUIZ;
}

function _isSurvey(node) {
  return get(node, 'extra_fields.options.modality') === ContentModalities.SURVEY;
}

function _getLicense(node) {
  return node.license && Licenses.get(node.license.id || node.license);
}

function _getMasteryModel(node) {
  const criteria = get(node, 'extra_fields.options.completion_criteria', {});
  if (criteria.model === CompletionCriteriaModels.MASTERY) {
    return criteria.threshold || {};
  }
  return {};
}

function _getLearningActivity(node) {
  return Object.keys(node.learning_activities);
}

function _getErrorMsg(error) {
  const messages = {
    [ValidationErrors.TITLE_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.LICENSE_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.COPYRIGHT_HOLDER_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.LICENSE_DESCRIPTION_REQUIRED]: translator.$tr('licenseDescriptionRequired'),
    [ValidationErrors.MASTERY_MODEL_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.MASTERY_MODEL_M_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.MASTERY_MODEL_M_WHOLE_NUMBER]: translator.$tr('fieldRequired'),
    [ValidationErrors.MASTERY_MODEL_M_GT_ZERO]: translator.$tr('masteryModelMGtZero'),
    [ValidationErrors.MASTERY_MODEL_M_LTE_N]: translator.$tr('masteryModelMLteN'),
    [ValidationErrors.MASTERY_MODEL_N_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.MASTERY_MODEL_N_WHOLE_NUMBER]: translator.$tr('masteryModelNWholeNumber'),
    [ValidationErrors.MASTERY_MODEL_N_GT_ZERO]: translator.$tr('masteryModelNGtZero'),
    [ValidationErrors.LEARNING_ACTIVITY_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.DURATION_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.COMPLETION_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.ACTIVITY_DURATION_REQUIRED]: translator.$tr('fieldRequired'),
    [ValidationErrors.ACTIVITY_DURATION_MIN_FOR_SHORT_ACTIVITY]:
      translator.$tr('activityDurationGteOne'),
    [ValidationErrors.ACTIVITY_DURATION_MAX_FOR_SHORT_ACTIVITY]:
      translator.$tr('shortActivityLteThirty'),
    [ValidationErrors.ACTIVITY_DURATION_MIN_FOR_LONG_ACTIVITY]:
      translator.$tr('longActivityGtThirty'),
    [ValidationErrors.ACTIVITY_DURATION_MAX_FOR_LONG_ACTIVITY]: translator.$tr(
      'longActivityLteOneTwenty',
    ),
    [ValidationErrors.ACTIVITY_DURATION_MIN_REQUIREMENT]: translator.$tr('activityDurationGteOne'),
    [ValidationErrors.ACTIVITY_DURATION_TOO_LONG]: translator.$tr('activityDurationTooLongWarning'),
  };

  return messages[error] || error;
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
  return [value => Boolean(value && value.trim()) || ValidationErrors.TITLE_REQUIRED];
}

export function getLicenseValidators() {
  return [value => Boolean(value) || ValidationErrors.LICENSE_REQUIRED];
}

export function getCopyrightHolderValidators() {
  return [value => Boolean(value && value.trim()) || ValidationErrors.COPYRIGHT_HOLDER_REQUIRED];
}

export function getLearningActivityValidators() {
  return [value => Boolean(value.length) || ValidationErrors.LEARNING_ACTIVITY_REQUIRED];
}

export function getCompletionValidators() {
  return [value => Boolean(value) || ValidationErrors.COMPLETION_REQUIRED];
}

export function getDurationValidators() {
  return [value => Boolean(value.length) || ValidationErrors.DURATION_REQUIRED];
}

export function getLicenseDescriptionValidators() {
  return [value => Boolean(value && value.trim()) || ValidationErrors.LICENSE_DESCRIPTION_REQUIRED];
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

export function getShortActivityDurationValidators() {
  return [
    v => v !== '' || ValidationErrors.ACTIVITY_DURATION_REQUIRED,
    v => v >= 5 || ValidationErrors.ACTIVITY_DURATION_MIN_FOR_SHORT_ACTIVITY,
    v => v <= 30 || ValidationErrors.ACTIVITY_DURATION_MAX_FOR_SHORT_ACTIVITY,
  ];
}

export function getLongActivityDurationValidators() {
  return [
    v => v !== '' || ValidationErrors.ACTIVITY_DURATION_REQUIRED,
    v => v > 40 || ValidationErrors.ACTIVITY_DURATION_MIN_FOR_LONG_ACTIVITY,
    v => v <= 120 || ValidationErrors.ACTIVITY_DURATION_MAX_FOR_LONG_ACTIVITY,
  ];
}

export function getActivityDurationValidators() {
  return [
    v => v !== '' || ValidationErrors.ACTIVITY_DURATION_REQUIRED,
    v => v >= 1 || ValidationErrors.ACTIVITY_DURATION_MIN_REQUIREMENT,
    v => v <= 1200 || ValidationErrors.ACTIVITY_DURATION_TOO_LONG,
  ];
}

/**
 * Get invalid text for a given value using a list of validators.
 * @param {Array<Function>} validators
 * @param {*} value Value to validate.
 * @returns {String}  Translated error message of the first validator that returns an error.
                      Empty string if value is valid.
 */
export function getInvalidText(validators, value) {
  return (
    validators
      .map(validator => translateValidator(validator)(value))
      .find(validation => validation !== true) || ''
  );
}

// Node validation
// These functions return an array of error codes
export function getNodeTitleErrors(node) {
  return getTitleValidators()
    .map(validator => validator(node.title))
    .filter(value => value !== true);
}

export function getNodeLicenseErrors(node) {
  const license = _getLicense(node);
  return getLicenseValidators()
    .map(validator => validator(license))
    .filter(value => value !== true);
}

export function getNodeCopyrightHolderErrors(node) {
  const license = _getLicense(node);
  if (!license || !license.copyright_holder_required) {
    return [];
  }
  return getCopyrightHolderValidators()
    .map(validator => validator(node.copyright_holder))
    .filter(value => value !== true);
}

export function getNodeLearningActivityErrors(node) {
  const learningActivity = _getLearningActivity(node);
  return getLearningActivityValidators()
    .map(validator => validator(learningActivity))
    .filter(value => value !== true);
}

export function getCompletionDurationErrors(node) {
  const criteria = get(node, 'extra_fields.options.completion_criteria', {});
  // duration requirement is blocking only when is is required for the model
  // and there is no valid threshold
  if (criteria.model === CompletionCriteriaModels.TIME) {
    if (criteria.threshold) {
      return [];
    } else {
      return getDurationValidators()
        .map(validator => validator(node))
        .filter(value => value !== true);
    }
  }
  return [];
}

export function getNodeLicenseDescriptionErrors(node) {
  const license = _getLicense(node);
  if (!license || !license.is_custom) {
    return [];
  }
  return getLicenseDescriptionValidators()
    .map(validator => validator(node.license_description))
    .filter(value => value !== true);
}

export function getNodeMasteryModelErrors(node) {
  const mastery = _getMasteryModel(node);
  return getMasteryModelValidators()
    .map(validator => validator(mastery && mastery.mastery_model))
    .filter(value => value !== true);
}

export function getNodeMasteryModelMErrors(node) {
  const mastery = _getMasteryModel(node);
  if (!mastery || mastery.mastery_model !== MasteryModelsNames.M_OF_N) {
    return [];
  }
  return getMasteryModelMValidators(mastery.n)
    .map(validator => validator(mastery.m))
    .filter(value => value !== true);
}

export function getNodeMasteryModelNErrors(node) {
  const mastery = _getMasteryModel(node);
  if (!mastery || mastery.mastery_model !== MasteryModelsNames.M_OF_N) {
    return [];
  }
  return getMasteryModelNValidators()
    .map(validator => validator(mastery.n))
    .filter(value => value !== true);
}

/**
 * Validate node details - title, license etc.
 * @param {Object} node A node.
 * @returns {Array} An array of error codes.
 */
export function getNodeDetailsErrors(node) {
  let errors = [];

  const titleErrors = getNodeTitleErrors(node);
  if (titleErrors.length) {
    errors = errors.concat(titleErrors);
  }

  const completionDurationErrors = getCompletionDurationErrors(node);
  if (completionDurationErrors.length) {
    errors = errors.concat(completionDurationErrors);
  }

  // authoring information is required for resources
  if (!node.freeze_authoring_data && node.kind !== ContentKindsNames.TOPIC) {
    const licenseErrors = getNodeLicenseErrors(node);
    const copyrightHolderErrors = getNodeCopyrightHolderErrors(node);
    const licenseDescriptionErrors = getNodeLicenseDescriptionErrors(node);

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

  // learning activity is a required field for resources
  if (node.kind !== ContentKindsNames.TOPIC) {
    const learningActivityErrors = getNodeLearningActivityErrors(node);
    if (learningActivityErrors.length) {
      errors = errors.concat(learningActivityErrors);
    }
  }

  // mastery is required on exercises but not on practice quizzes
  // Practice quiz requirements are set in the background, and separate validations
  // run to check this based on the completion_criteria in LE utils
  if (node.kind === ContentKindsNames.EXERCISE && !_isPracticeQuiz(node) && !_isSurvey(node)) {
    const masteryModelErrors = getNodeMasteryModelErrors(node);
    const masteryModelMErrors = getNodeMasteryModelMErrors(node);
    const masteryModelNErrors = getNodeMasteryModelNErrors(node);

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
export function getNodeFilesErrors(files) {
  let errors = [];
  if (files && files.length > 0) {
    errors = files.filter(f => f.error).map(f => f.error);
    const validPrimaryFiles = files.filter(f => !f.error && !f.preset.supplementary);
    if (!validPrimaryFiles.length) {
      errors.push(ValidationErrors.NO_VALID_PRIMARY_FILES);
    }
  }
  return errors;
}

/**
 * The last verdict reached for an item. Keyed by the item,
 *
 * @type {WeakMap<Object, { rawData: string, allowFreeResponse: boolean, errors: Array }>}
 */
const errorsByAssessmentItem = new WeakMap();

/**
 * Validate an assessment item.
 *
 * Questions are authored and stored as QTI, so the QTI editor owns what makes one valid;
 * this reads its verdict without rendering anything. Perseus questions come from other
 * tools and are not validated here.
 *
 * @param {Object} assessmentItem An assessment item.
 * @param {Object} [options]
 * @param {Boolean} [options.allowFreeResponse] Whether free-response questions are
 *   permitted — they are only meaningful on surveys.
 * @returns {Array} An array of errors.
 */
export function getAssessmentItemErrors(assessmentItem, { allowFreeResponse = true } = {}) {
  if (assessmentItem.type === AssessmentItemTypes.PERSEUS_QUESTION) {
    return [];
  }

  const cached = errorsByAssessmentItem.get(assessmentItem);
  if (
    cached &&
    cached.rawData === assessmentItem.raw_data &&
    cached.allowFreeResponse === allowFreeResponse
  ) {
    return cached.errors;
  }

  const errors = validateQtiItem(assessmentItem.raw_data, { allowFreeResponse });
  errorsByAssessmentItem.set(assessmentItem, {
    rawData: assessmentItem.raw_data,
    allowFreeResponse,
    errors,
  });
  return errors;
}
