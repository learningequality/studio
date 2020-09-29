import { AssessmentItem, uuid4, resolveUpdater } from 'shared/data/resources';

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
  // Don't wait for IndexedDB update to be finished before
  // commiting update to store on purpose to allow for immediate
  // updates (needed when typing text to answers or hints editor
  // fast for example)
  context.commit('UPDATE_ASSESSMENTITEM', assessmentItem);

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
}

export function copyAssessmentItems(context, { params, updater }) {
  let itemMap = {};
  updater = resolveUpdater(updater);
  return AssessmentItem.bulkCopy(params, assessmentItem => {
    const id = uuid4();
    itemMap[assessmentItem.id] = id;
    const base = updater(assessmentItem);
    return { ...base, id };
  }).then(newAssessmentItems => {
    if (!newAssessmentItems.length) {
      return [];
    }

    newAssessmentItems.forEach(item => {
      context.commit('ADD_ASSESSMENTITEM', item);
    });

    return context
      .dispatch(
        'file/copyFiles',
        {
          params: {
            assessment_item__in: Object.keys(itemMap),
          },
          updater: file => {
            return {
              assessment_item: itemMap[file.assessment_item],
            };
          },
        },
        { root: true }
      )
      .then(() => newAssessmentItems);
  });
}

export function deleteAssessmentItem(context, assessmentItem) {
  return AssessmentItem.delete([assessmentItem.contentnode, assessmentItem.assessment_id]).then(
    () => {
      context.commit('DELETE_ASSESSMENTITEM', assessmentItem);
    }
  );
}
