import Vue from 'vue';
import { mergeMapItem } from 'shared/vuex/utils';

export function ADD_ASSESSMENTITEM(state, assessmentItem) {
  if (!assessmentItem.assessment_id) {
    throw ReferenceError('assessment_id must be defined to update an assessment item');
  }
  if (!assessmentItem.contentnode) {
    throw ReferenceError('contentnode must be defined to update an assessment item');
  }
  state.assessmentItemsMap[assessmentItem.contentnode] = mergeMapItem(
    state.assessmentItemsMap[assessmentItem.contentnode] || {},
    assessmentItem,
    'assessment_id'
  );
}

export function ADD_ASSESSMENTITEMS(state, assessmentItems = []) {
  assessmentItems.forEach(assessmentItem => {
    ADD_ASSESSMENTITEM(state, assessmentItem);
  });
}

export function REMOVE_ASSESSMENTITEM(state, assessmentItem) {
  Vue.delete(state.assessmentItemsMap[assessmentItem.contentnode], assessmentItem.id);
}
