import translator from './translator';
import { AssessmentItemTypes } from 'frontend/channelEdit/constants';

export { AssessmentItemTypes, ValidationErrors } from 'frontend/channelEdit/constants';

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
  EDIT_ITEM: 'EDIT_ITEM',
  MOVE_ITEM_UP: 'MOVE_ITEM_UP',
  MOVE_ITEM_DOWN: 'MOVE_ITEM_DOWN',
  DELETE_ITEM: 'DELETE_ITEM',
  ADD_ITEM_ABOVE: 'ADD_ITEM_ABOVE',
  ADD_ITEM_BELOW: 'ADD_ITEM_BELOW',
};

export const AssessmentItemTypeLabels = {
  [AssessmentItemTypes.SINGLE_SELECTION]: translator.translate('questionTypeSingleSelection'),
  [AssessmentItemTypes.MULTIPLE_SELECTION]: translator.translate('questionTypeMultipleSelection'),
  [AssessmentItemTypes.TRUE_FALSE]: translator.translate('questionTypeTrueFalse'),
  [AssessmentItemTypes.INPUT_QUESTION]: translator.translate('questionTypeInput'),
};
