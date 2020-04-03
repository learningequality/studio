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
 * Get an array of nested arrays containing error codes for corresponding assessment items.
 */
export function getAssessmentItemsErrors(state) {
  return function(contentNodeId) {
    return getAssessmentItems(state)(contentNodeId).map(validateAssessmentItem);
  };
}

/**
 * Get total number of invalid assessment items of a node.
 */
export function getInvalidAssessmentItemsCount(state) {
  return function(contentNodeId) {
    return getAssessmentItemsErrors(state)(contentNodeId).filter(arr => arr.length).length;
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
