import sortBy from 'lodash/sortBy';
import { validateAssessmentItem } from '../../utils';

function sorted(items) {
  return sortBy(items, ['order']);
}

export function getNodeAssessmentItems(state) {
  return function(contentNodeId) {
    return sorted(Object.values(state.assessmentItemsMap[contentNodeId]));
  };
}

export function getNodeAssessmentItemErrors(state, getters) {
  return function(contentNodeId) {
    return getters.getNodeAssessmentItems(contentNodeId).map(validateAssessmentItem);
  };
}

export function getInvalidNodeAssessmentItemsCount(state, getters) {
  return function(contentNodeId) {
    return getters.getNodeAssessmentItemErrors(contentNodeId).filter(arr => arr.length).length;
  };
}

export function areNodeAssessmentItemsValid(state, getters) {
  return function(contentNodeId) {
    return getters.getInvalidNodeAssessmentItemsCount(contentNodeId) === 0;
  };
}
