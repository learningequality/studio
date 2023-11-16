import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state: () => ({
    /* List of caption files for a contentnode
     * [
     *     contentnode_id: {
     *         pk: {
     *             id: pk
     *             file_id: file_id
     *             language: language
     *             __generating_captions: boolean
     *         }
     *     },
     * ]
     */
    captionFilesMap: [],
    /* Caption Cues for a contentnode
     * [
     *    caption_file_id: {
     *      id: id
     *      starttime: starttime
     *      endtime: endtime
     *      text: text
     *    }
     * ]
     */
    captionCuesMap: [],
  }),
  getters,
  mutations,
  actions,
  listeners: {
    [TABLE_NAMES.CAPTION_FILE]: {
      [CHANGE_TYPES.CREATED]: 'ADD_CAPTIONFILE',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_CAPTIONFILE_FROM_INDEXEDDB',
      [CHANGE_TYPES.DELETED]: 'DELETE_CAPTIONFILE',
    },
    [TABLE_NAMES.CAPTION_CUES]: {
      [CHANGE_TYPES.CREATED]: 'ADD_CAPTIONCUES',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_CAPTIONCUE',
      [CHANGE_TYPES.DELETED]: 'DELETE_CAPTIONCUE',
    },
  },
};
