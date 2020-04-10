import { AssessmentItem, uuid4, resolveUpdater } from 'shared/data/resources';

/**
 * Load all assessment items belonging to a content node.
 */
export function loadNodeAssessmentItems(context, nodeId) {
  return loadAssessmentItems(context, { contentnode: nodeId });
}

export function loadAssessmentItems(context, params = {}) {
  return AssessmentItem.where(params).then(assessmentItems => {
    assessmentItems.forEach(assessmentItem => {
      context.commit('ADD_ASSESSMENTITEM', assessmentItem);
    });
    return assessmentItems;
  });
}

export function loadAssessmentItem(context, id) {
  return AssessmentItem.get(id)
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

  return AssessmentItem.put(stringifiedAssessmentItem).then(assessment_id => {
    context.commit('ADD_ASSESSMENTITEM', {
      ...assessmentItem,
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
  return AssessmentItem.put(stringifiedAssessmentItem);
}

export function copyAssessmentItems(context, { params, updater }) {
  let itemMap = {};
  updater = resolveUpdater(updater);
  return AssessmentItem.where(params)
    .then(assessmentItems => {
      if (!assessmentItems.length) {
        return [];
      }

      return AssessmentItem.bulkCopy(assessmentItems, assessmentItem => {
        const id = uuid4();
        itemMap[assessmentItem.id] = id;
        return item => ({ ...updater(item), id });
      });
    })
    .then(newAssessmentItems => {
      if (!newAssessmentItems.length) {
        return [];
      }

      context.commit('ADD_ASSESSMENTITEMS', newAssessmentItems);

      return context
        .dispatch('file/copyFiles', {
          params: {
            assessment_items: Object.keys(itemMap),
          },
          updater: file => {
            return {
              assessment_item: itemMap[file.assessment_item],
            };
          },
        })
        .then(() => newAssessmentItems);
    });
}

export function deleteAssessmentItem(context, assesmentItem) {
  return AssessmentItem.delete(assesmentItem.assessment_id).then(() => {
    context.commit('DELETE_ASSESSMENTITEM', assesmentItem);
  });
}
