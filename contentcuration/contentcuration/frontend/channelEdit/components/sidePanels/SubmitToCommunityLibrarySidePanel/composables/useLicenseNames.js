import { computed, ref } from 'vue';
import { findLicense } from 'shared/utils/helpers';

export function useLicenseNames(licenseIds) {
  const isLoading = ref(false);
  const error = ref(null);

  const licenseNames = computed(() => {
    if (!licenseIds.value || licenseIds.value.length === 0) {
      return [];
    }

    return licenseIds.value
      .map(id => {
        const license = findLicense(id);
        return license?.license_name || null;
      })
      .filter(name => name !== null);
  });

  const formattedLicenseNames = computed(() => {
    const names = licenseNames.value;
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    return names.join(', ');
  });

  return {
    licenseNames,
    formattedLicenseNames,
    isLoading,
    error,
  };
}
