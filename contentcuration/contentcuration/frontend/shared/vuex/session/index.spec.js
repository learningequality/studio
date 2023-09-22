import vuexSessionModule from './index.js';
import { FeatureFlagKeys } from 'shared/constants';

describe('session module feature flag related getters', () => {
  let state;
  beforeEach(() => {
    state = {
      currentUser: {
        feature_flags: {
          true_flag: true,
          false_flag: false,
        },
      },
    };
    state.currentUser.feature_flags[FeatureFlagKeys.ai_feature] = true;
  });

  describe('featureFlags', () => {
    let getters;
    beforeEach(() => {
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

  describe('hasFeatureEnabled', () => {
    let getters;
    beforeEach(() => {
      getters = {
        featureFlags: state.currentUser.feature_flags,
        hasFeatureEnabled: vuexSessionModule.getters.hasFeatureEnabled,
      };
    });
    it('for admin user returns true even when the flag value is false', () => {
      getters.isAdmin = true;
      expect(getters.hasFeatureEnabled(state, getters)('true_flag')).toBe(true);
      expect(getters.hasFeatureEnabled(state, getters)('false_flag')).toBe(true);
    });

    it('returns flag value for non-admin user', () => {
      getters.isAdmin = false;
      expect(getters.hasFeatureEnabled(state, getters)('true_flag')).toBe(true);
      expect(getters.hasFeatureEnabled(state, getters)('false_flag')).toBe(false);
    });
  });

  describe('isAIFeatureEnabled', () => {
    let getters;
    beforeEach(() => {
      getters = {
        loggedIn: true,
        hasFeatureEnabled: vuexSessionModule.getters.hasFeatureEnabled(state, {
          featureFlags: vuexSessionModule.getters.featureFlags(state),
          isAdmin: false,
        }),
        isAIFeatureEnabled: vuexSessionModule.getters.isAIFeatureEnabled,
      };
    });
    it('should return false if not logged in', () => {
      getters.loggedIn = false;
      expect(getters.isAIFeatureEnabled(state, getters)).toBe(false);
    });

    it('should return true if logged in and ai feature flag is true', () => {
      expect(getters.isAIFeatureEnabled(state, getters)).toBe(true);
    });

    it('should return false if logged in and ai feature flag is false', () => {
      state.currentUser.feature_flags[FeatureFlagKeys.ai_feature] = false;
      expect(getters.isAIFeatureEnabled(state, getters)).toBe(false);
    });
  });
});
