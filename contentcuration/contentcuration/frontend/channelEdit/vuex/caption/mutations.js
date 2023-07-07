// Modify the state in vuex.
// They are Sync functions that receive the current state and payload as arguments.
// Mutations should be the only way to update the state in Vuex, and they ensure that state changes are tracked and consistent.
// Mutations are committed from actions using the commit method.
// 1. set the caption using vue.set
// 2. delete the caption using vue.delete

export function ADD_CAPTIONFILES(state, captionFiles) {
  captionFiles.forEach(captionFile => {
    Vue.set(state.captionsMap, captionFile.id, captionFile);
  });
}
