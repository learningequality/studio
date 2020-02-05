import { sanitizeAssessmentItems } from './utils';
import { AssessmentItem } from 'shared/data/resources';

export function loadAssessmentItems(context, params = {}) {
  return AssessmentItem.where(params).then(assesmentItems => {
    context.commit('ADD_ASSESSMENTITEMS', assesmentItems);
    return assesmentItems;
  });
}

export function loadAssessmentItem(context, id) {
  return AssessmentItem.get(id)
    .then(assesmentItem => {
      context.commit('ADD_ASSESSMENTITEM', assesmentItem);
      return assesmentItem;
    })
    .catch(() => {
      return;
    });
}

/* ASSESSMENTITEM EDITOR ACTIONS */
export function updateAssessmentItems(context, assessmentItems) {
  if (!Array.isArray(assessmentItems)) {
    throw TypeError('assessmentItems must be an array of assessmentItems');
  }
  // Keep all assessment items in vuex state
  context.commit('ADD_ASSESSMENTITEMS', assessmentItems);
  // Only commit assessment items that pass sanitization
  return Promise.all(sanitizeAssessmentItems(assessmentItems).map(assessmentItem => AssessmentItem.put(assessmentItem)));
}

export function deleteAssessmentItem(context, assesmentItemId) {
  return AssessmentItem.delete(assesmentItemId).then(() => {
    context.commit('REMOVE_ASSESSMENTITEM', assesmentItemId);
  });
}
