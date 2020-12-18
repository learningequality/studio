import { viewModes } from './constants';

export function isCompactViewMode(state) {
  const { viewMode } = state.viewModeOverrides.slice().pop() || state;
  return viewMode === viewModes.COMPACT;
}

export function isComfortableViewMode(state) {
  const { viewMode } = state.viewModeOverrides.slice().pop() || state;
  return viewMode === viewModes.COMFORTABLE;
}

// Convenience function to format strings like "Page Name - Channel Name"
// for tab titles
export function appendChannelName(state, getters) {
  return function(string) {
    // Fallback if current channel isn't available yet
    const channel = getters['currentChannel/currentChannel'];

    if (channel) {
      return string ? `${string} - ${channel.name}` : channel.name;
    }

    return string || '';
  };
}
