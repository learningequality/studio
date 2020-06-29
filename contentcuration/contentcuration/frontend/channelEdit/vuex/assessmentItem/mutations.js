import Vue from 'vue';
import { mergeMapItem } from 'shared/vuex/utils';

export function ADD_ASSESSMENTITEM(state, assessmentItem) {
  UPDATE_ASSESSMENTITEM(state, assessmentItem);
}

export function UPDATE_ASSESSMENTITEM(state, assessmentItem) {
  if (!assessmentItem.assessment_id) {
    throw ReferenceError('assessment_id must be defined to update an assessment item');
  }
  if (!assessmentItem.contentnode) {
    throw ReferenceError('contentnode must be defined to update an assessment item');
  }

  // data can come from API that returns answers and hints as string
  let answers, hints;
  if (typeof assessmentItem.answers === 'string') {
    answers = JSON.parse(assessmentItem.answers);
  } else {
    answers = assessmentItem.answers ? assessmentItem.answers : [];
  }

  if (typeof assessmentItem.hints === 'string') {
    hints = JSON.parse(assessmentItem.hints);
  } else {
    hints = assessmentItem.hints ? assessmentItem.hints : [];
  }

  answers.sort((answer1, answer2) => (answer1.order > answer2.order ? 1 : -1));
  hints.sort((hint1, hint2) => (hint1.order > hint2.order ? 1 : -1));

  Vue.set(
    state.assessmentItemsMap,
    assessmentItem.contentnode,
    mergeMapItem(
      state.assessmentItemsMap[assessmentItem.contentnode] || {},
      {
        ...assessmentItem,
        answers,
        hints,
      },
      'assessment_id'
    )
  );
}

export function DELETE_ASSESSMENTITEM(state, assessmentItem) {
  Vue.delete(state.assessmentItemsMap[assessmentItem.contentnode], assessmentItem.assessment_id);
}
