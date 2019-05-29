export function currentPage(state) {
  return state.pageState.pageType;
}

export function channels(state) {
  return state.channels;
}

export function changed(state) {
  return state.changed;
}

export function name(state) {
  return state.name;
}

export function description(state) {
  return state.description;
}

export function loadChannels(state) {
  return state.loadChannels;
}

export function channelSet(state) {
  return state.channelSet;
}

export function allChannels(state) {
  return state.allChannels;
}

export function isValid(state) {
  // Add validation here
  return state.stopValidation || state.name.length > 0;
}

export function saving(state) {
  return state.saving;
}

export function closing(state) {
  return state.closing;
}
