import Vue from "vue";

/* Mutations for Caption File */
export function ADD_CAPTIONFILE(state, { captionFile, nodeId }) {
  if(!state.captionFilesMap[nodeId]) {
    Vue.set(state.captionFilesMap, nodeId, {});
  }

  // Check if the pk exists in the contentNode's object
  if (!state.captionFilesMap[nodeId][captionFile.id]) {
    // If it doesn't exist, create an empty object for that pk
    Vue.set(state.captionFilesMap[nodeId], captionFile.id, {});
  }

  // Check if the file_id and language combination already exists
  const key = `${captionFile.file_id}_${captionFile.language}`;
  // if(state.captionFilesMap[nodeId][captionFile.id]) {

  // }

  // Finally, set the file_id and language for that pk
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'id', captionFile.id);
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'file_id', captionFile.file_id);
  Vue.set(state.captionFilesMap[nodeId][captionFile.id], 'language', captionFile.language);
  console.log(state.captionFilesMap);
}

export function ADD_CAPTIONFILES(state, captionFiles, nodeId) {
  if (Array.isArray(captionFiles)) {
    captionFiles.forEach(captionFile => {
      ADD_CAPTIONFILE(state, captionFile, nodeId);
    });
  }
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
