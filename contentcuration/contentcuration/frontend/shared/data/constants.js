export const CHANGE_TYPES = {
  CREATED: 1,
  UPDATED: 2,
  DELETED: 3,
  MOVED: 4,
  COPIED: 5,
};

// Tables
export const CHANGES_TABLE = 'changesForSyncing';

export const CHANGE_LOCKS_TABLE = 'changeLocks';

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
  CHANGE_LOCKS_TABLE,
};

export const APP_ID = 'KolibriStudio';

// Transaction sources
/**
 * This transaction source will be ignored when tracking the
 * client's changes
 *
 * @type {string}
 */
export const IGNORED_SOURCE = 'IGNORED_SOURCE';

export const REVERT_SOURCE = 'REVERT/' + IGNORED_SOURCE;

export const RELATIVE_TREE_POSITIONS = {
  FIRST_CHILD: 'first-child',
  LAST_CHILD: 'last-child',
  LEFT: 'left',
  RIGHT: 'right',
};

// Special fields used for copying and other async tasks
export const COPYING_FLAG = '__COPYING';
export const TASK_ID = '__TASK_ID';

// This constant is used for saving/retrieving a current
// user object from the session table
export const CURRENT_USER = 'CURRENT_USER';
