const { computed, ref } = require('vue');

const MOCK_DEFAULTS = {
  isLoading: ref(true),
  isFinished: ref(false),
  data: computed(() => null),
  fetchData: jest.fn(() => Promise.resolve()),
};

function usePublishedDataMock(overrides = {}) {
  return {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
}

const usePublishedData = jest.fn(() => usePublishedDataMock());

module.exports = { usePublishedData, usePublishedDataMock };

