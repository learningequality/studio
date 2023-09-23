import Vue from 'vue';
import { GENERATING } from 'shared/data/constants';

/* Mutations for Caption File */
export function ADD_CAPTIONFILE(state, { captionFile, nodeId }) {
  if (!captionFile && !nodeId) return;
  // Check if there is Map for the current nodeId
  if (!state.captionFilesMap[nodeId]) {
    Vue.set(state.captionFilesMap, nodeId, {});
  }

  // Check if the pk exists in the contentNode's object
  if (!state.captionFilesMap[nodeId][captionFile.id]) {
    Vue.set(state.captionFilesMap[nodeId], captionFile.id, {});
  }

  // Finally, set the file_id and language for that pk
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'id', captionFile.id);
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'file_id', captionFile.file_id);
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'language', captionFile.language);
  Vue.set(
    state.captionFilesMap[nodeId][captionFile.id],
    GENERATING,
    captionFile[GENERATING] ? captionFile[GENERATING] : false
  );
}

export function ADD_CAPTIONFILES(state, { captionFiles, nodeIds }) {
  // TODO: this causes to not update vuex state correctly on initial loading of component
  captionFiles.forEach((captionFile, index) => {
    const nodeId = nodeIds[index];
    ADD_CAPTIONFILE(state, { captionFile, nodeId });
  });
}

/* Mutations for Caption Cues */
export function ADD_CUE(state, { cue, nodeId }) {
  
  console.log(cue, nodeId);
  
  if (!cue && !nodeId) return;
  // Check if there is Map for the current nodeId
  if (!state.captionCuesMap[nodeId]) {
    Vue.set(state.captionCuesMap, nodeId, {});
  }

  // Check if the pk exists in the contentNode's object
  if (!state.captionCuesMap[nodeId][cue.captiop_file_id]) {
    Vue.set(state.captionCuesMap[nodeId], cue.captiop_file_id, {});
  }

  Vue.set(state.captionCuesMap[nodeId][cue.caption_file_id], 'id', cue.id);
  Vue.set(state.captionCuesMap[nodeId][cue.caption_file_id], 'text', cue.text);
  Vue.set(state.captionCuesMap[nodeId][cue.caption_file_id], 'starttime', cue.starttime);
  Vue.set(state.captionCuesMap[nodeId][cue.caption_file_id], 'endtime', cue.endtime);
}

export function ADD_CAPTIONCUES(state, { cues, nodeId }) {
  if(Array.isArray(cues)) {
    cues.forEach(cue => {
      ADD_CUE(state, { cue, nodeId });
    });
  }
}

export function UPDATE_CAPTIONFILE_FROM_INDEXEDDB(state, { id, ...mods }) {
  if (!id) return;
  for (const nodeId in state.captionFilesMap) {
    if (state.captionFilesMap[nodeId][id]) {
      Vue.set(state.captionFilesMap[nodeId][id], GENERATING, mods[GENERATING]);
      break;
    }
  }
  console.log('done');
}
