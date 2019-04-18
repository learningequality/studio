export function SET_CHANNEL(state, channel) {
  state.channel = channel;
  state.nodes = [];
  state.nodes.push(channel.main_tree);
}

export function SET_CHANNEL_LANGUAGE(state, languageID) {
  state.channel.language = languageID;
}

export function RESET_STATE(state) {
  Object.assign(state, {
    channel: null,
  });
}

export function SET_PUBLISHING(state, publishing) {
  state.channel.main_tree.publishing = publishing;
}

export function SET_CHANGED(state, changed) {
  state.channel.has_changed = changed;
}
