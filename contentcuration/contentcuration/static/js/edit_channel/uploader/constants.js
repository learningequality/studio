import translator from './translator';
import { fileErrors } from 'edit_channel/file_upload/constants';

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

export const ValidationErrors = {
  TITLE_REQUIRED: 'TITLE_REQUIRED',
  LICENCE_REQUIRED: 'LICENCE_REQUIRED',
  COPYRIGHT_HOLDER_REQUIRED: 'COPYRIGHT_HOLDER_REQUIRED',
  LICENCE_DESCRIPTION_REQUIRED: 'LICENCE_DESCRIPTION_REQUIRED',
  MASTERY_MODEL_REQUIRED: 'MASTERY_MODEL_REQUIRED',
  MASTERY_MODEL_INVALID: 'MASTERY_MODEL_INVALID',
  QUESTION_REQUIRED: 'QUESTION_REQUIRED',
  INVALID_NUMBER_OF_CORRECT_ANSWERS: 'INVALID_NUMBER_OF_CORRECT_ANSWERS',
  ...fileErrors,
};

export const AssessmentItemToolbarActions = {
  EDIT_ITEM: 'EDIT_ITEM',
  MOVE_ITEM_UP: 'MOVE_ITEM_UP',
  MOVE_ITEM_DOWN: 'MOVE_ITEM_DOWN',
  DELETE_ITEM: 'DELETE_ITEM',
  ADD_ITEM_ABOVE: 'ADD_ITEM_ABOVE',
  ADD_ITEM_BELOW: 'ADD_ITEM_BELOW',
};

// should correspond to backend types
export const AssessmentItemTypes = {
  SINGLE_SELECTION: 'single_selection',
  MULTIPLE_SELECTION: 'multiple_selection',
  TRUE_FALSE: 'true_false',
  INPUT_QUESTION: 'input_question',
};

export const AssessmentItemTypeLabels = {
  [AssessmentItemTypes.SINGLE_SELECTION]: translator.translate('questionTypeSingleSelection'),
  [AssessmentItemTypes.MULTIPLE_SELECTION]: translator.translate('questionTypeMultipleSelection'),
  [AssessmentItemTypes.TRUE_FALSE]: translator.translate('questionTypeTrueFalse'),
  [AssessmentItemTypes.INPUT_QUESTION]: translator.translate('questionTypeInput'),
};
