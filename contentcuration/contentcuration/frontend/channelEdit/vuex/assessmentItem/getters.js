import { validateAssessmentItem } from '../../utils';

export function getNodeAssessmentItems(state) {
  return function(contentNodeId) {
    if (!state.assessmentItemsMap[contentNodeId]) {
      return [];
    }

    const items = Object.values(state.assessmentItemsMap[contentNodeId]);
    return items.sort((item1, item2) => (item1.order > item2.order ? 1 : -1));
  };
}

export function getNodeAssessmentItemErrors(state) {
  return function(contentNodeId) {
    return getNodeAssessmentItems(state)(contentNodeId).map(validateAssessmentItem);
  };
}

export function getInvalidNodeAssessmentItemsCount(state) {
  return function(contentNodeId) {
    return getNodeAssessmentItemErrors(state)(contentNodeId).filter(arr => arr.length).length;
  };
}

export function getAssessmentItemsAreValid(state) {
  return function(contentNodeId) {
    return getInvalidNodeAssessmentItemsCount(state)(contentNodeId) === 0;
  };
}
