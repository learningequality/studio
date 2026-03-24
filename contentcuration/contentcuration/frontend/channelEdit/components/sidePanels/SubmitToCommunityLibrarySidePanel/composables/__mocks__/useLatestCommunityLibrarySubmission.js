import { computed, ref } from 'vue';

const MOCK_DEFAULTS = {
  isLoading: ref(true),
  isFinished: ref(false),
  data: computed(() => null),
  fetchData: jest.fn(() => Promise.resolve()),
};

export function useLatestCommunityLibrarySubmissionMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

export const useLatestCommunityLibrarySubmission = jest.fn(() =>
  useLatestCommunityLibrarySubmissionMock(),
);
