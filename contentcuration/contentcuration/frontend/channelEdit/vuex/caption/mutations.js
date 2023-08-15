import Vue from "vue";
import { GENERATING } from 'shared/data/constants'
// import { applyMods } from 'shared/data/applyRemoteChanges';

/* Mutations for Caption File */
export function ADD_CAPTIONFILE(state, { captionFile, nodeId }) {
  if(!captionFile && !nodeId) return;
  // Check if there is Map for the current nodeId
  if(!state.captionFilesMap[nodeId]) {
    Vue.set(state.captionFilesMap, nodeId, {});
  }

  // Check if the pk exists in the contentNode's object
  if (!state.captionFilesMap[nodeId][captionFile.id]) {
    // If it doesn't exist, create an empty object for that pk
    Vue.set(state.captionFilesMap[nodeId], captionFile.id, {});
  }

  // Finally, set the file_id and language for that pk
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'id', captionFile.id);
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'file_id', captionFile.file_id);
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'language', captionFile.language);
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], GENERATING, captionFile[GENERATING])
}

export function ADD_CAPTIONFILES(state, { captionFiles, nodeIds }) {
  captionFiles.forEach((captionFile, index) => {
    const nodeId = nodeIds[index];
    ADD_CAPTIONFILE(state, { captionFile, nodeId });
  });
}

/* Mutations for Caption Cues */
export function ADD_CUE(state, cue) {
  // TODO: add some checks to Cue

  Vue.set(state.captionCuesMap, cue.id, cue);
}

export function ADD_CAPTIONCUES(state, { data } = []) {
  if (Array.isArray(data)) {  // Workaround to fix TypeError: data.forEach
    data.forEach(cue => {
      ADD_CUE(state, cue);
    })
  }
}

export function UPDATE_CAPTIONFILE_FROM_INDEXEDDB(state, { id, ...mods }) {
  if(!id) return;
  for (const nodeId in state.captionFilesMap) {
    if (state.captionFilesMap[nodeId][id]) {
      Vue.set(state.captionFilesMap[nodeId][id], GENERATING, mods[GENERATING]);
      // updateCaptionCuesMaps(state, state.captionCuesMap[nodeId][id]);
      break;
    }
  }
  console.log('done');
}