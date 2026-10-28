import Vue, { set } from 'vue';
import { mergeMapItem } from 'shared/vuex/utils';
import { applyMods } from 'shared/data/applyRemoteChanges';

export function UPDATE_ASSESSMENTITEM(state, assessmentItem) {
  if (!assessmentItem.assessment_id) {
    throw ReferenceError('assessment_id must be defined to update an assessment item');
  }
  if (!assessmentItem.contentnode) {
    throw ReferenceError('contentnode must be defined to update an assessment item');
  }

  set(
    state.assessmentItemsMap,
    assessmentItem.contentnode,
    mergeMapItem(
      state.assessmentItemsMap[assessmentItem.contentnode] || {},
      assessmentItem,
      'assessment_id',
    ),
  );
}

export function UPDATE_ASSESSMENTITEM_FROM_INDEXEDDB(state, { id, ...mods }) {
  const [contentnode, assessment_id] = id || [null, null];
  if (
    id &&
    state.assessmentItemsMap[contentnode] &&
    state.assessmentItemsMap[contentnode][assessment_id]
  ) {
    set(state.assessmentItemsMap[contentnode], assessment_id, {
      ...applyMods(state.assessmentItemsMap[contentnode][assessment_id], mods),
    });
  }
}

export function DELETE_ASSESSMENTITEM(state, assessmentItem) {
  if (state.assessmentItemsMap[assessmentItem.contentnode]) {
    Vue.delete(state.assessmentItemsMap[assessmentItem.contentnode], assessmentItem.assessment_id);
  }
}
