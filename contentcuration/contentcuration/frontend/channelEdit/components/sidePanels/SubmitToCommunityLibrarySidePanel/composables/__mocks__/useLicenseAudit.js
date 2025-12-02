import { computed, ref } from 'vue';

const MOCK_DEFAULTS = {
  isLoading: computed(() => false),
  isFinished: computed(() => true),
  invalidLicenses: computed(() => []),
  specialPermissions: computed(() => []),
  includedLicenses: computed(() => []),
  isAuditing: ref(false),
  hasAuditData: computed(() => false),
  auditTaskId: ref(null),
  error: ref(null),
  checkAndTriggerAudit: jest.fn(),
  triggerAudit: jest.fn(),
  fetchPublishedData: jest.fn(),
};

export function useLicenseAuditMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export const useLicenseAudit = jest.fn(() => useLicenseAuditMock());
