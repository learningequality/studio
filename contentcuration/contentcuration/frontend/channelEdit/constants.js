import { AssessmentItemTypes } from 'shared/constants';

export const RouteNames = {
  SANDBOX: 'SANDBOX',
  TREE_ROOT_VIEW: 'TREE_ROOT_VIEW',
  TREE_VIEW: 'TREE_VIEW',
  STAGING_TREE_VIEW: 'STAGING_TREE_VIEW',
  STAGING_TREE_VIEW_REDIRECT: 'STAGING_TREE_VIEW_REDIRECT',
  ORIGINAL_SOURCE_NODE_IN_TREE_VIEW: 'ORIGINAL_SOURCE_NODE_IN_TREE_VIEW',
  CONTENTNODE_DETAILS: 'CONTENTNODE_DETAILS',
  MULTI_CONTENTNODE_DETAILS: 'MULTI_CONTENTNODE_DETAILS',
  IMPORT_FROM_CHANNELS: 'IMPORT_FROM_CHANNELS',
  IMPORT_FROM_CHANNELS_BROWSE: 'IMPORT_FROM_CHANNELS_BROWSE',
  IMPORT_FROM_CHANNELS_SEARCH: 'IMPORT_FROM_CHANNELS_SEARCH',
  IMPORT_FROM_CHANNELS_REVIEW: 'IMPORT_FROM_CHANNELS_REVIEW',
  ADD_TOPICS: 'ADD_TOPICS',
  ADD_EXERCISE: 'ADD_EXERCISE',
  UPLOAD_FILES: 'UPLOAD_FILES',
  TRASH: 'TRASH',
  ADD_PREVIOUS_STEPS: 'ADD_PREVIOUS_STEPS',
  ADD_NEXT_STEPS: 'ADD_NEXT_STEPS',
};

export const viewModes = {
  DEFAULT: 'DEFAULT_VIEW',
  COMFORTABLE: 'COMFORTABLE_VIEW',
  COMPACT: 'COMPACT_VIEW',
};

// These should match the `channel_error` enum on contentcuration.views.base.channels
export const ChannelEditPageErrors = Object.freeze({
  CHANNEL_NOT_FOUND: 'CHANNEL_EDIT_ERROR_CHANNEL_NOT_FOUND',
  CHANNEL_DELETED: 'CHANNEL_EDIT_ERROR_CHANNEL_DELETED',
});

export const AssessmentItemToolbarActions = {
  EDIT_ITEM: 'EDIT_ITEM',
  MOVE_ITEM_UP: 'MOVE_ITEM_UP',
  MOVE_ITEM_DOWN: 'MOVE_ITEM_DOWN',
  DELETE_ITEM: 'DELETE_ITEM',
  ADD_ITEM_ABOVE: 'ADD_ITEM_ABOVE',
  ADD_ITEM_BELOW: 'ADD_ITEM_BELOW',
};

export const AssessmentItemTypeLabels = {
  [AssessmentItemTypes.SINGLE_SELECTION]: 'questionTypeSingleSelection',
  [AssessmentItemTypes.MULTIPLE_SELECTION]: 'questionTypeMultipleSelection',
  [AssessmentItemTypes.TRUE_FALSE]: 'questionTypeTrueFalse',
  [AssessmentItemTypes.INPUT_QUESTION]: 'questionTypeInput',
  [AssessmentItemTypes.PERSEUS_QUESTION]: 'questionTypePerseus',
  [AssessmentItemTypes.FREE_RESPONSE]: 'questionTypeFreeResponse',
};

export const TabNames = {
  DETAILS: 'details',
  PREVIEW: 'preview',
  QUESTIONS: 'questions',
  RELATED: 'related',
};

export const modes = {
  EDIT: 'EDIT',
  NEW_TOPIC: 'NEW_TOPIC',
  NEW_EXERCISE: 'NEW_EXERCISE',
  UPLOAD: 'UPLOAD',
  VIEW_ONLY: 'VIEW_ONLY',
};

export const DraggableUniverses = {
  CONTENT_NODES: 'contentNodes',
};

export const DraggableRegions = {
  TREE: 'tree',
  TOPIC_VIEW: 'topicView',
  CLIPBOARD: 'clipboard',
};

/**
 * Default page size for the import search page
 * @type {number}
 */
export const ImportSearchPageSize = 10;

export const QuickEditModals = {
  TITLE_DESCRIPTION: 'TITLE_DESCRIPTION',
  TAGS: 'TAGS',
  LANGUAGE: 'LANGUAGE',
  CATEGORIES: 'CATEGORIES',
  LEVELS: 'LEVELS',
  LEARNING_ACTIVITIES: 'LEARNING_ACTIVITIES',
  SOURCE: 'SOURCE',
  AUDIENCE: 'AUDIENCE',
  COMPLETION: 'COMPLETION',
  WHAT_IS_NEEDED: 'WHAT_IS_NEEDED',
};
