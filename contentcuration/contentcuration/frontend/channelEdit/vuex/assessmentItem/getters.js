import { validateAssessmentItem } from '../../utils';

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
 */
export function getAssessmentItemsErrors(state) {
  return function(contentNodeId) {
    const assessmentItemsErrors = {};
    if (!state.assessmentItemsMap || !state.assessmentItemsMap[contentNodeId]) {
      return assessmentItemsErrors;
    }
    Object.keys(state.assessmentItemsMap[contentNodeId]).forEach(assessmentItemId => {
      assessmentItemsErrors[assessmentItemId] = validateAssessmentItem(
        state.assessmentItemsMap[contentNodeId][assessmentItemId]
      );
    });
    return assessmentItemsErrors;
  };
}

/**
 * Get total number of invalid assessment items of a node.
 */
export function getInvalidAssessmentItemsCount(state) {
  return function(contentNodeId) {
    let count = 0;
    const assessmentItemsErrors = getAssessmentItemsErrors(state)(contentNodeId);

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
export function getAssessmentItemsAreValid(state) {
  return function(contentNodeId) {
    return getInvalidAssessmentItemsCount(state)(contentNodeId) === 0;
  };
}
