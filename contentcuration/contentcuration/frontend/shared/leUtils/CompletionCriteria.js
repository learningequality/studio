import CompletionCriteriaModels, { SCHEMA } from 'kolibri-constants/CompletionCriteria';
import { SCHEMA as MASTERY_SCHEMA } from 'kolibri-constants/MasteryCriteria';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { compile } from 'shared/utils/jsonSchema';
import { ValidationErrors } from 'shared/constants';

/**
 * @type {Function<boolean>|ValidateFunction}
 */
const _validate = compile(SCHEMA, [MASTERY_SCHEMA]);

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
    validate.errors = [ValidationErrors.INVALID_COMPLETION_CRITERIA_MODEL];
    return false;
  }

  return true;
}
