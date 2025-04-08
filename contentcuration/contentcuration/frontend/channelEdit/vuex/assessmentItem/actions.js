import { AssessmentItem } from 'shared/data/resources';
import { isNodeComplete } from 'shared/utils/validation';
import db from 'shared/data/db';
import { TABLE_NAMES } from 'shared/data/constants';

function updateNodeComplete(nodeId, context, maxTries = 10, delayMs = 100) {
  let tries = 0;

  function tryUpdate() {
    const node = context.rootGetters['contentNode/getContentNode'](nodeId);
    if (node) {
      console.log('number of tries: ', tries);
      const complete = isNodeComplete({
        nodeDetails: node,
        assessmentItems: context.getters.getAssessmentItems(nodeId),
        files: context.rootGetters['file/getContentNodeFiles'](nodeId),
      });
      return context.dispatch(
        'contentNode/updateContentNode',
        { id: nodeId, complete },
        { root: true }
      );
    } else if (tries < maxTries) {
      tries++;
      setTimeout(tryUpdate, delayMs);
    } else {
      console.error(`updateNodeComplete: Node ${nodeId} not found in Vuex after ${maxTries} tries`);
    }
  }
  tryUpdate();
}

/**
 * Load all assessment items belonging to a content node.
 */
export function loadNodeAssessmentItems(context, nodeId) {
  return loadAssessmentItems(context, { contentnode__in: [nodeId] });
}

export function loadAssessmentItems(context, params = {}) {
  return AssessmentItem.where(params).then(assessmentItems => {
    assessmentItems.forEach(assessmentItem => {
      context.commit('UPDATE_ASSESSMENTITEM', assessmentItem);
    });
    return assessmentItems;
  });
}

export function addAssessmentItem(context, assessmentItem) {
  // API accepts answers and hints as strings
  const stringifiedAssessmentItem = {
    ...assessmentItem,
    answers: JSON.stringify(assessmentItem.answers || []),
    hints: JSON.stringify(assessmentItem.hints || []),
  };

  return db.transaction(
    'rw',
    [TABLE_NAMES.CONTENTNODE, TABLE_NAMES.ASSESSMENTITEM, TABLE_NAMES.CHANGES_TABLE],
    () => {
      return AssessmentItem.add(stringifiedAssessmentItem).then(([contentnode, assessment_id]) => {
        context.commit('UPDATE_ASSESSMENTITEM', {
          ...assessmentItem,
          contentnode,
          assessment_id,
        });
        return updateNodeComplete(contentnode, context);
      });
    }
  );
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

  return db.transaction(
    'rw',
    [TABLE_NAMES.CONTENTNODE, TABLE_NAMES.ASSESSMENTITEM, TABLE_NAMES.CHANGES_TABLE],
    () => {
      return Promise.all(
        assessmentItems.map(assessmentItem => {
          // API accepts answers and hints as strings
          const stringifiedAssessmentItem = {
            ...assessmentItem,
          };
          if (assessmentItem.answers) {
            stringifiedAssessmentItem.answers = JSON.stringify(assessmentItem.answers);
          }
          if (assessmentItem.hints) {
            stringifiedAssessmentItem.hints = JSON.stringify(assessmentItem.hints);
          }
          return AssessmentItem.update(
            [assessmentItem.contentnode, assessmentItem.assessment_id],
            stringifiedAssessmentItem
          ).then(() => {
            updateNodeComplete(assessmentItem.contentnode, context);
          });
        })
      );
    }
  );
}

export function deleteAssessmentItem(context, assessmentItem) {
  return db.transaction(
    'rw',
    [TABLE_NAMES.CONTENTNODE, TABLE_NAMES.ASSESSMENTITEM, TABLE_NAMES.CHANGES_TABLE],
    () => {
      return AssessmentItem.delete([assessmentItem.contentnode, assessmentItem.assessment_id]).then(
        () => {
          context.commit('DELETE_ASSESSMENTITEM', assessmentItem);
          const contentnode = assessmentItem.contentnode;
          return updateNodeComplete(contentnode, context);
        }
      );
    }
  );
}
