import { computed } from 'vue';

const MOCK_DEFAULTS = {
  snackbarIsVisible: false,
  snackbarOptions: {},
  createSnackbar: jest.fn(),
  clearSnackbar: jest.fn(),
};

export function useSnackbarMock(overrides = {}) {
  const mocks = {
    ...MOCK_DEFAULTS,
    ...overrides,
  };
  const computedMocks = {};
  for (const key in mocks) {
    if (typeof mocks[key] !== 'function') {
      computedMocks[key] = computed(() => mocks[key]);
    } else {
      computedMocks[key] = mocks[key];
    }
  }
  return computedMocks;
}

export default jest.fn(() => useSnackbarMock());
