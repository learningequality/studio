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

export const AssessmentItemToolbarActions = {
  MOVE_ITEM_UP: 'MOVE_ITEM_UP',
  MOVE_ITEM_DOWN: 'MOVE_ITEM_DOWN',
  EDIT_ITEM: 'EDIT_ITEM',
  ADD_ITEM_ABOVE: 'ADD_ITEM_ABOVE',
  ADD_ITEM_BELOW: 'ADD_ITEM_BELOW',
  DELETE_ITEM: 'DELETE_ITEM',
};

export const AssessmentItemValidationErrors = {
  BLANK_QUESTION: 'BLANK_QUESTION',
  INVALID_NUMBER_OF_CORRECT_ANSWERS: 'INVALID_NUMBER_OF_CORRECT_ANSWERS',
};

// should correspond to backend types
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
