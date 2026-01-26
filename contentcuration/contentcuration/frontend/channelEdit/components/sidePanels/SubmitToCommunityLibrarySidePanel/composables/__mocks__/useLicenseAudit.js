import { computed } from 'vue';

const MOCK_DEFAULTS = {
  isLoading: computed(() => false),
  isFinished: computed(() => true),
  invalidLicenses: computed(() => []),
  specialPermissions: computed(() => []),
  includedLicenses: computed(() => []),
  hasAuditData: computed(() => false),
};

export function useLicenseAuditMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export const useLicenseAudit = jest.fn(() => useLicenseAuditMock());
