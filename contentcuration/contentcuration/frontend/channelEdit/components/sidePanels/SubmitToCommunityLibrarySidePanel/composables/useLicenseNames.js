import { findLicense } from 'shared/utils/helpers';

export function formatLicenseNames(licenseIds) {
  if (!licenseIds || !Array.isArray(licenseIds) || licenseIds.length === 0) {
    return '';
  }

  return licenseIds
    .map(id => {
      const license = findLicense(id);
      return license?.license_name || null;
    })
    .filter(name => name !== null)
    .join(', ');
}
