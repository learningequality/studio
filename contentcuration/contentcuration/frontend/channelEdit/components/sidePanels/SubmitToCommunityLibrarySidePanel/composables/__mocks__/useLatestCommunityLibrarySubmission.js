const { computed, ref } = require('vue');

const MOCK_DEFAULTS = {
  isLoading: ref(true),
  isFinished: ref(false),
  data: computed(() => null),
  fetchData: jest.fn(() => Promise.resolve()),
};

function useLatestCommunityLibrarySubmissionMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

const useLatestCommunityLibrarySubmission = jest.fn(() => useLatestCommunityLibrarySubmissionMock());

module.exports = { useLatestCommunityLibrarySubmission, useLatestCommunityLibrarySubmissionMock };

