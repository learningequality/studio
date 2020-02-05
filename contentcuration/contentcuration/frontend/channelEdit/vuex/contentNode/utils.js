import { ValidationErrors } from '../../constants';
import Constants from 'edit_channel/constants/index';

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
