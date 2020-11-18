import { AssessmentItem } from 'shared/data/resources';

/**
 * Load all assessment items belonging to a content node.
 */
export function loadNodeAssessmentItems(context, nodeId) {
  return loadAssessmentItems(context, { contentnode__in: [nodeId] });
}

export function loadAssessmentItems(context, params = {}) {
  return AssessmentItem.where(params).then(assessmentItems => {
    assessmentItems.forEach(assessmentItem => {
      context.commit('ADD_ASSESSMENTITEM', assessmentItem);
    });
    return assessmentItems;
  });
}

export function loadAssessmentItem(context, [contentnode, assessment_id]) {
  return AssessmentItem.get([contentnode, assessment_id])
    .then(assessmentItem => {
      context.commit('ADD_ASSESSMENTITEM', assessmentItem);
      return assessmentItem;
    })
    .catch(() => {
      return;
    });
}

export function addAssessmentItem(context, assessmentItem) {
  // API accepts answers and hints as strings
  const stringifiedAssessmentItem = {
    ...assessmentItem,
    answers: JSON.stringify(assessmentItem.answers || []),
    hints: JSON.stringify(assessmentItem.hints || []),
  };

  return AssessmentItem.put(stringifiedAssessmentItem).then(([contentnode, assessment_id]) => {
    context.commit('ADD_ASSESSMENTITEM', {
      ...assessmentItem,
      contentnode,
      assessment_id,
    });
  });
}

export function updateAssessmentItem(context, assessmentItem) {
  return updateAssessmentItems(context, [assessmentItem]);
}

export function updateAssessmentItems(context, assessmentItems) {
  // Don't wait for IndexedDB update to be finished before
  // commiting update to store on purpose to allow for immediate
  // updates (needed when typing text to answers or hints editor
  // fast for example)
  assessmentItems.forEach(assessmentItem => {
    context.commit('UPDATE_ASSESSMENTITEM', assessmentItem);
  });

  return Promise.all(
    assessmentItems.map(assessmentItem => {
      // API accepts answers and hints as strings
      const stringifiedAssessmentItem = {
        ...assessmentItem,
        answers: JSON.stringify(assessmentItem.answers || []),
        hints: JSON.stringify(assessmentItem.hints || []),
      };
      return AssessmentItem.update(
        [assessmentItem.contentnode, assessmentItem.assessment_id],
        stringifiedAssessmentItem
      );
    })
  );
}

export function deleteAssessmentItem(context, assessmentItem) {
  return AssessmentItem.delete([assessmentItem.contentnode, assessmentItem.assessment_id]).then(
    () => {
      context.commit('DELETE_ASSESSMENTITEM', assessmentItem);
    }
  );
}
