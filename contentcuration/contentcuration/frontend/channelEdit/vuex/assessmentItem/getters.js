import { getAssessmentItemErrors } from 'shared/utils/validation';
import { DELAYED_VALIDATION } from 'shared/constants';

/**
 * Get assessment items of a node.
 */
export function getAssessmentItems(state) {
  return function(contentNodeId) {
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
  return function(contentNodeId) {
    return getAssessmentItems(state)(contentNodeId).length;
  };
}

/**
 * Get a map of assessment items errors where keys are assessment ids.
 * Consider new assessment items as valid if `ignoreDelayed` is true.
 */
export function getAssessmentItemsErrors(state) {
  return function({ contentNodeId, ignoreDelayed = false, modality = null }) {
    const assessmentItemsErrors = {};
    if (!state.assessmentItemsMap || !state.assessmentItemsMap[contentNodeId]) {
      return assessmentItemsErrors;
    }
    Object.keys(state.assessmentItemsMap[contentNodeId]).forEach(assessmentItemId => {
      const assessmentItem = state.assessmentItemsMap[contentNodeId][assessmentItemId];
      if (ignoreDelayed && assessmentItem[DELAYED_VALIDATION]) {
        assessmentItemsErrors[assessmentItemId] = [];
      } else {
        assessmentItemsErrors[assessmentItemId] = getAssessmentItemErrors(assessmentItem, modality);
      }
    });
    return assessmentItemsErrors;
  };
}

/**
 * Get total number of invalid assessment items of a node.
 * Consider new assessment items as valid if `ignoreDelayed` is true.
 */
export function getInvalidAssessmentItemsCount(state) {
  return function({ contentNodeId, ignoreDelayed = false, modality = null }) {
    let count = 0;
    const assessmentItemsErrors = getAssessmentItemsErrors(state)({
      contentNodeId, ignoreDelayed, modality
    });

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
 * Consider new assessment items as valid if `ignoreDelayed` is true.
 */
export function getAssessmentItemsAreValid(state) {
  return function({ contentNodeId, ignoreDelayed = false, modality = null }) {
    return getInvalidAssessmentItemsCount(state)({ contentNodeId, ignoreDelayed, modality }) === 0;
  };
}
