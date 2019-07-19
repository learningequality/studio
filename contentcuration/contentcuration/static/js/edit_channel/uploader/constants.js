export const TabNames = {
  DETAILS: 'DETAILS',
  PREVIEW: 'PREVIEW',
  QUESTIONS: 'QUESTIONS',
  PREREQUISITES: 'PREREQUISITES',
};

export const modes = {
  EDIT: 'EDIT',
  NEW_TOPIC: 'NEW_TOPIC',
  NEW_EXERCISE: 'NEW_EXERCISE',
  UPLOAD: 'UPLOAD',
  VIEW_ONLY: 'VIEW_ONLY',
};

export const AssessmentItemTypes = {
  SINGLE_SELECTION: 'single_selection',
  MULTIPLE_SELECTION: 'multiple_selection',
  TRUE_FALSE: 'true_false',
  INPUT_QUESTION: 'input_question',
};

export const AssessmentItemTypeLabels = {
  [AssessmentItemTypes.SINGLE_SELECTION]: 'Single selection',
  [AssessmentItemTypes.MULTIPLE_SELECTION]: 'Multiple selection',
  [AssessmentItemTypes.TRUE_FALSE]: 'True/False',
  [AssessmentItemTypes.INPUT_QUESTION]: 'Input question',
};

export const AssessmentItemToolbarActions = {
  MOVE_ITEM_UP: 'move_item_up',
  MOVE_ITEM_DOWN: 'move_item_down',
  EDIT_ITEM: 'edit_item',
  ADD_ITEM_ABOVE: 'add_item_above',
  ADD_ITEM_BELOW: 'add_item_below',
  DELETE_ITEM: 'delete_item',
};

export const AssessmentItemValidationErrors = {
  BLANK_QUESTION: 'BLANK_QUESTION',
  INVALID_NUMBER_OF_CORRECT_ANSWERS: 'INVALID_NUMBER_OF_CORRECT_ANSWERS',
};
