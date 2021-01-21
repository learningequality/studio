import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state: () => {
    return {
      // We maintain a map for each top level object
      // that can reference files - so far we implement
      // contentnode and assessmentitem maps
      // Unlike other maps, this is a nested map
      // the top level key is the top level id
      // then file ids are used as keys in
      // the subsidiary maps
      contentNodeFilesMap: {},
      assessmentItemFilesMap: {},
      // A map for tracking file upload info
      // keyed by file id
      fileUploadsMap: {},
      // A map for tracking thumbnail generations for nodes
      contentNodeThumbnailGenerations: [],
    };
  },
  getters,
  mutations,
  actions,
  listeners: {
    [TABLE_NAMES.FILE]: {
      [CHANGE_TYPES.CREATED]: 'ADD_FILE',
      [CHANGE_TYPES.UPDATED]: 'ADD_FILE',
      [CHANGE_TYPES.DELETED]: 'REMOVE_FILE',
    },
  },
};
