// Get the caption for the given id?

// used to access and compute derived state from the Vuex store

// They allow you to retrieve and manipulate data from the state without modifying it directly

// are accessed as properties in components using the mapGetters helper or directly from the store using the store.getters syntax.

export function getCaptionFiles(state) {
  return Object.values(state.captionsMap);
}
