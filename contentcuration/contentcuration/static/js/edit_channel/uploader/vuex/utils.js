import _ from 'underscore';

export function getSelected(state) {
  return _.map(state.selectedIndices, index => state.nodes[index]);
}

/**
 * Update `order` fields according to a position in an array.
 */
export const updateAssessmentDraftOrder = assessmentDraft => {
  return assessmentDraft.map((item, itemIdx) => {
    return {
      ...item,
      data: {
        ...item.data,
        order: itemIdx,
      },
    };
  });
};

export const isAssessmentItemInvalid = item => {
  if (!item.validation) {
    return false;
  }

  return (
    (item.validation.questionErrors && item.validation.questionErrors.length > 0) ||
    (item.validation.answersErrors && item.validation.answersErrors.length > 0)
  );
};
