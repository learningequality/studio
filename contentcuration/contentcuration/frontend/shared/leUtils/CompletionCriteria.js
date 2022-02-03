import CompletionCriteriaModels, { SCHEMA } from 'kolibri-constants/CompletionCriteria';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { compile } from 'shared/utils/jsonSchema';

/**
 * @type {Function<boolean>|ValidateFunction}
 */
const _validate = compile(SCHEMA);

export const ERRORS = {
  MODEL_CONTENT_KIND_MISMATCH: 'Completion criteria model invalid for content kind',
};

/**
 * @param {Object} criteria
 * @param {String} contentKind
 * @return {boolean}
 */
export function validate(criteria, contentKind = null) {
  // Mimic ajv validation for simplicity
  validate.errors = [];

  if (!_validate(criteria)) {
    validate.errors = _validate.errors;
    return false;
  }

  // Validate certain models only apply to certain content kinds
  if (
    (criteria.model === CompletionCriteriaModels.PAGES &&
      contentKind !== ContentKindsNames.DOCUMENT) ||
    (criteria.model === CompletionCriteriaModels.MASTERY &&
      contentKind !== ContentKindsNames.EXERCISE)
  ) {
    validate.errors = [ERRORS.MODEL_CONTENT_KIND_MISMATCH];
    return false;
  }

  return true;
}
