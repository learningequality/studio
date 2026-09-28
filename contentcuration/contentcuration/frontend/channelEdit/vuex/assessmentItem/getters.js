import { ContentModalities } from 'shared/constants';
import { getAssessmentItemErrors } from 'shared/utils/validation';
/**
 * Get assessment items of a node.
 */
export function getAssessmentItems(state) {
  return function (contentNodeId) {
    if (!state.assessmentItemsMap[contentNodeId]) {
      return [];
    }

    const items = Object.values(state.assessmentItemsMap[contentNodeId]);
    return items.sort((item1, item2) => (item1.order > item2.order ? 1 : -1));
  };
}

/**
 * Get total number of assessment items of a node.
 */
export function getAssessmentItemsCount(state) {
  return function (contentNodeId) {
    return getAssessmentItems(state)(contentNodeId).length;
  };
}

/**
 * Get a map of assessment items errors where keys are assessment ids.
 */
export function getAssessmentItemsErrors(state, getters, rootState, rootGetters) {
  return function ({ contentNodeId }) {
    const assessmentItemsErrors = {};

    const contentNode = rootGetters['contentNode/getContentNode'](contentNodeId);
    const modality = contentNode?.extra_fields?.options?.modality;

    if (!state.assessmentItemsMap || !state.assessmentItemsMap[contentNodeId]) {
      return assessmentItemsErrors;
    }
    // Free-response questions cannot be scored, so they only make sense on a survey.
    const allowFreeResponse = modality === ContentModalities.SURVEY;

    Object.keys(state.assessmentItemsMap[contentNodeId]).forEach(assessmentItemId => {
      const assessmentItem = state.assessmentItemsMap[contentNodeId][assessmentItemId];

      assessmentItemsErrors[assessmentItemId] = getAssessmentItemErrors(assessmentItem, {
        allowFreeResponse,
      });
    });
    return assessmentItemsErrors;
  };
}

/**
 * Get total number of invalid assessment items of a node.
 */
export function getInvalidAssessmentItemsCount(state, getters, rootState, rootGetters) {
  return function ({ contentNodeId }) {
    let count = 0;
    const assessmentItemsErrors = getAssessmentItemsErrors(
      state,
      getters,
      rootState,
      rootGetters,
    )({ contentNodeId });

    for (const assessmentItemId in assessmentItemsErrors) {
      if (assessmentItemsErrors[assessmentItemId].length) {
        count += 1;
      }
    }

    return count;
  };
}

/**
 * Are all assessment items of a node valid?
 */
export function getAssessmentItemsAreValid(state, getters, rootState, rootGetters) {
  return function ({ contentNodeId }) {
    return (
      getInvalidAssessmentItemsCount(state, getters, rootState, rootGetters)({ contentNodeId }) ===
      0
    );
  };
}
