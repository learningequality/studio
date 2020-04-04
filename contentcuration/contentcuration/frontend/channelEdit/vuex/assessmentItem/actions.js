import { AssessmentItem } from 'shared/data/resources';

/**
 * Load all assessment items belonging to a content node.
 */
export function loadNodeAssessmentItems(context, nodeId) {
  return loadAssessmentItems(context, { contentnode: nodeId });
}

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
  return Promise.all(
    assessmentItems.map(assessmentItem => {
      return AssessmentItem.put(assessmentItem).then(assessment_id => {
        context.commit('ADD_ASSESSMENTITEM', {
          ...assessmentItem,
          assessment_id,
        });
      });
    })
  );
}

export function deleteAssessmentItem(context, assesmentItemId) {
  return AssessmentItem.delete(assesmentItemId).then(() => {
    context.commit('REMOVE_ASSESSMENTITEM', assesmentItemId);
  });
}
