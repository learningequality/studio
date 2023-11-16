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
    [GENERATING]: captionFile[GENERATING] || false,
  });
}

export function ADD_CAPTIONFILES(state, { captionFiles, nodeIds }) {
  // TODO: this causes to not update Vuex state correctly on the initial loading of the component
  let currentIndex = 0; // pointer to nodeIds
  if (Array.isArray(captionFiles)) {
    captionFiles.forEach((captionFile, index) => {
      if (index > 0) {
        const prevCaptionFile = captionFiles[index - 1];
        if (captionFile.file_id !== prevCaptionFile.file_id) currentIndex++;
      }

      const nodeId = currentIndex < nodeIds.length ? nodeIds[currentIndex] : null;
      if (nodeId !== null) {
        ADD_CAPTIONFILE(state, { captionFile, nodeId });
      }
    });
  }
}

/* Mutations for Caption Cues */
export function ADD_CUE(state, { cue }) {
  if (!cue) return;

  if (!state.captionCuesMap[cue.caption_file_id]) {
    Vue.set(state.captionCuesMap, cue.caption_file_id, {});
  }

  const fileMap = state.captionCuesMap[cue.caption_file_id];

  Vue.set(state.captionCuesMap, cue.caption_file_id, {
    ...fileMap,
    [cue.id]: {
      id: cue.id,
      text: cue.text,
      starttime: cue.starttime,
      endtime: cue.endtime,
    },
  });
}

export function ADD_CAPTIONCUES(state, { cues }) {
  if (Array.isArray(cues)) {
    cues.forEach((cue) => {
      ADD_CUE(state, { cue });
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
