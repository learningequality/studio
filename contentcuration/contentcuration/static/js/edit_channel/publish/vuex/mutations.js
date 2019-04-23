export function SET_CHANNEL(state, channel) {
  state.channel = channel;
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
