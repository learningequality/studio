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
