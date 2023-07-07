export const CHANGE_TYPES = {
  CREATED: 1,
  UPDATED: 2,
  DELETED: 3,
  MOVED: 4,
  COPIED: 5,
  PUBLISHED: 6,
  SYNCED: 7,
  DEPLOYED: 8,
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

// Tables
export const CHANGES_TABLE = 'changesForSyncing';

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
  CAPTION_FILE: 'caption_file',
  CAPTION_CUES: 'caption_cues',
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

export const RELATIVE_TREE_POSITIONS = {
  FIRST_CHILD: 'first-child',
  LAST_CHILD: 'last-child',
  LEFT: 'left',
  RIGHT: 'right',
};

// Special fields used for frontend specific handling
export const COPYING_FLAG = '__COPYING';
export const TASK_ID = '__TASK_ID';
export const LAST_FETCHED = '__last_fetch';

// This constant is used for saving/retrieving a current
// user object from the session table
export const CURRENT_USER = 'CURRENT_USER';

// A key in the session table that stores the currently active channels to listen for updates
export const ACTIVE_CHANNELS = 'ACTIVE_CHANNELS';

export const CHANNEL_SYNC_KEEP_ALIVE_INTERVAL = 300 * 1000;

export const MAX_REV_KEY = 'max_rev';
