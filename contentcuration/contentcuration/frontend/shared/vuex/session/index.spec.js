import vuexSessionModule from './index.js';

describe('session module feature flag related getters', () => {
  describe('featureFlags', () => {
    let state, getters;

    beforeEach(() => {
      state = {
        currentUser: {
          feature_flags: {
            flag1: true,
            flag2: false,
          },
        },
      };
      getters = {
        featureFlags: vuexSessionModule.getters.featureFlags,
      };
    });
    it('should return feature flags from current user', () => {
      const result = getters.featureFlags(state);
      expect(result).toEqual(state.currentUser.feature_flags);
    });

    it('should return empty object if no feature flags set', () => {
      state.currentUser = {};
      const result = getters.featureFlags(state);
      expect(result).toEqual({});
    });
  });

  describe('isAIFeatureEnabled', () => {
    let state, getters;

    beforeEach(() => {
      state = {
        currentUser: {
          feature_flags: {
            ai_feature: true,
          },
        },
      };
      getters = {
        loggedIn: false,
        featureFlags: state.currentUser.feature_flags,
        isAIFeatureEnabled: vuexSessionModule.getters.isAIFeatureEnabled,
      };
    });

    it('should return false if not logged in', () => {
      expect(getters.isAIFeatureEnabled(state, getters)).toBe(false);
    });

    it('should return true if logged in and ai feature flag is true', () => {
      getters.loggedIn = true;
      expect(getters.isAIFeatureEnabled(state, getters)).toBe(true);
    });

    it('should return false if logged in and ai feature flag is false', () => {
      getters.loggedIn = true;
      state.currentUser.feature_flags.ai_feature = false;
      expect(getters.isAIFeatureEnabled(state, getters)).toBe(false);
    });
  });
});
