import Vue from "vue";

/* Mutations for Caption File */
export function ADD_CAPTIONFILE(state, captionFile) {
  // TODO: add some checks to File

  Vue.set(state.captionFilesMap, captionFile.id, captionFile);
}

export function ADD_CAPTIONFILES(state, captionFiles = []) {
  if (Array.isArray(captionFiles)) {  // Workaround to fix TypeError: captionFiles.forEach
    captionFiles.forEach(captionFile => {
      ADD_CAPTIONFILE(state, captionFile);
    });
  }
}

export function UPDATE_CAPTIONFILE_FROM_INDEXEDDB(state, {id, ...mods}) {
  // TODO, is this needed?
}

export function DELETE_CAPTIONFILE(state, captionFile) {
  // TODO
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
