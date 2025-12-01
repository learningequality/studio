import { findLicense } from 'shared/utils/helpers';
import { constantStrings } from 'shared/mixins';

/**
 * Formats and translates license names from license IDs
 * @param {Array} licenseIds - Array of license IDs
 * @param {Object} options - Optional configuration
 * @param {Array<string>} options.excludes - Array of license names to exclude (e.g., ['Special Permissions'])
 * @returns {string} Comma-separated string of translated license names
 */
export function formatLicenseNames(licenseIds, options = {}) {
  if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
    return '';
  }

  const { excludes = [] } = options;

  return licenseIds
    .map(id => {
      const license = findLicense(id);
      const licenseName = license?.license_name;
      
      // Exclude licenses specified in the excludes option
      if (!licenseName || excludes.includes(licenseName)) {
        return null;
      }
      
      // Translate the license name
      return constantStrings.$tr(licenseName);
    })
    .filter(name => name !== null && name !== undefined && name !== '')
    .join(', ');
}
