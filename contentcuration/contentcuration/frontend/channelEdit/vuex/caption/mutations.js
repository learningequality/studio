import Vue from 'vue';
import { GENERATING } from 'shared/data/constants';

/* Mutations for Caption File */
export function ADD_CAPTIONFILE(state, { captionFile, nodeId }) {
  if (!nodeId || !captionFile) return;
  // Check if there is Map for the current nodeId
  if (!state.captionFilesMap[nodeId]) {
    Vue.set(state.captionFilesMap, nodeId, {});
  }

  // Spread the new data into the state
  Vue.set(state.captionFilesMap[nodeId], captionFile.id, {
    ...state.captionFilesMap[nodeId][captionFile.id],
    id: captionFile.id,
    file_id: captionFile.file_id,
    language: captionFile.language,
    [GENERATING]: captionFile[GENERATING] || false
  })
}

export function ADD_CAPTIONFILES(state, { captionFiles, nodeIds }) {
  // TODO: this causes to not update Vuex state correctly on the initial loading of the component
  let currentIndex = 0;

  //forEach errors: Failed to load content
  for (let index = 0; index < captionFiles.length; index++) {
    const captionFile = captionFiles[index];
    if (currentIndex >= nodeIds.length) {
      currentIndex = nodeIds.length - 1;
    }

    if (index > 0) {
      const prevCaptionFile = captionFiles[index - 1];
      if (captionFile.file_id !== prevCaptionFile.file_id) currentIndex++;
    }
    const nodeId = nodeIds[currentIndex];
    ADD_CAPTIONFILE(state, { captionFile, nodeId });
  }
}

/* Mutations for Caption Cues */
export function ADD_CUE(state, { cue, nodeId }) {
  if (!cue && !nodeId) return;
  // Check if there is Map for the current nodeId
  if (!state.captionCuesMap[nodeId]) {
    Vue.set(state.captionCuesMap, nodeId, {});
  }

  // Check if the pk exists in the contentNode's object
  if (!state.captionCuesMap[nodeId][cue.caption_file_id]) {
    Vue.set(state.captionCuesMap[nodeId], cue.caption_file_id, {});
  }

  Vue.set(state.captionCuesMap, nodeId, {
    ...nodeIdMap,
    [cue.caption_file_id]: {
      ...fileMap,
      id: cue.id,
      text: cue.text,
      starttime: cue.starttime,
      endtime: cue.endtime
    }
  });
}

export function ADD_CAPTIONCUES(state, { cues, nodeId }) {
  if (Array.isArray(cues)) {
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
}
