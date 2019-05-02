export function SET_CHANNEL(state, channel) {
  state.channel = channel;
}

export function SET_CHANNEL_LANGUAGE(state, languageID) {
  state.channel.language = languageID;
}

// TODO: Update once task logic is in place
export function SET_TASK(state, taskID) {
  state.tempTaskID = taskID;
}
