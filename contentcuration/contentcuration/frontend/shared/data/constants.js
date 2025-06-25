import invert from 'lodash/invert';

export const CHANGE_TYPES = {
  CREATED: 1,
  UPDATED: 2,
  DELETED: 3,
  MOVED: 4,
  COPIED: 5,
  PUBLISHED: 6,
  SYNCED: 7,
  DEPLOYED: 8,
  UPDATED_DESCENDANTS: 9,
  PUBLISHED_NEXT: 10,
};
/**
 * An array of change types that directly result in the creation of nodes
 * @type {(number)[]}
 */
export const CREATION_CHANGE_TYPES = [CHANGE_TYPES.CREATED, CHANGE_TYPES.COPIED];
/**
 * An array of change types that directly result in changes to tree structure
 * @type {(number)[]}
 */
export const TREE_CHANGE_TYPES = [CHANGE_TYPES.CREATED, CHANGE_TYPES.COPIED, CHANGE_TYPES.MOVED];

/**
 * An inverse lookup of CHANGE_TYPES to allow validation of CHANGE_TYPE values
 */
export const CHANGE_TYPES_LOOKUP = invert(CHANGE_TYPES);

// Tables
export const CHANGES_TABLE = 'changesForSyncing';
export const PAGINATION_TABLE = 'pagination';

export const TABLE_NAMES = {
  SESSION: 'session',
  CHANNEL: 'channel',
  INVITATION: 'invitation',
  CONTENTNODE: 'contentnode',
  CONTENTNODE_PREREQUISITE: 'contentnode_prerequisite',
  CHANNELSET: 'channelset',
  ASSESSMENTITEM: 'assessmentitem',
  FILE: 'file',
  USER: 'user',
  EDITOR_M2M: 'editor_m2m',
  VIEWER_M2M: 'viewer_m2m',
  SAVEDSEARCH: 'savedsearch',
  CLIPBOARD: 'clipboard',
  TASK: 'task',
  CHANGES_TABLE,
  BOOKMARK: 'bookmark',
};

/**
 * An inverse lookup of TABLE_NAMES to allow validation of TABLE_NAME values
 */
export const TABLE_NAMES_LOOKUP = invert(TABLE_NAMES);

export const APP_ID = 'KolibriStudio';

export const RELATIVE_TREE_POSITIONS = {
  FIRST_CHILD: 'first-child',
  LAST_CHILD: 'last-child',
  LEFT: 'left',
  RIGHT: 'right',
};

export const RELATIVE_TREE_POSITIONS_LOOKUP = invert(RELATIVE_TREE_POSITIONS);

export const COPYING_STATUS_VALUES = {
  COPYING: 'COPYING',
  FAILED: 'FAILED',
  SUCCESS: 'SUCCESS',
};

// Special fields used for frontend specific handling
export const COPYING_STATUS = '__COPYING_STATUS';
export const TASK_ID = '__TASK_ID';
export const LAST_FETCHED = '__last_fetch';

// This constant is used for saving/retrieving a current
// user object from the session table
export const CURRENT_USER = 'CURRENT_USER';

export const MAX_REV_KEY = 'max_rev';

export const LOCK_NAMES = {
  SYNC: 'sync',
  SYNC_CHANNEL: 'sync_channel:{channel_id}',
  SYNC_USER: 'sync_user',
  APPLY_CHANGES: 'apply_changes',
};
