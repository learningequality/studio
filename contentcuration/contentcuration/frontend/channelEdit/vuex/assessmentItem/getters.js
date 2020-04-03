import { validateAssessmentItem } from '../../utils';

export function getAssessmentItems(state) {
  return function(contentNodeId) {
    if (!state.assessmentItemsMap[contentNodeId]) {
      return [];
    }

    const items = Object.values(state.assessmentItemsMap[contentNodeId]);
    return items.sort((item1, item2) => (item1.order > item2.order ? 1 : -1));
  };
}

export function getAssessmentItemsCount(state) {
  return function(contentNodeId) {
    return getAssessmentItems(state)(contentNodeId).length;
  };
}

export function getAssessmentItemsErrors(state) {
  return function(contentNodeId) {
    return getAssessmentItems(state)(contentNodeId).map(validateAssessmentItem);
  };
}

export function getInvalidAssessmentItemsCount(state) {
  return function(contentNodeId) {
    return getAssessmentItemsErrors(state)(contentNodeId).filter(arr => arr.length).length;
  };
}

export function getAssessmentItemsAreValid(state) {
  return function(contentNodeId) {
    return getInvalidAssessmentItemsCount(state)(contentNodeId) === 0;
  };
}
