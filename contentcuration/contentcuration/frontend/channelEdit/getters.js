import { viewModes } from './constants';

export function isCompactViewMode(state) {
  const { viewMode } = state.viewModeOverrides.slice().pop() || state;
  return viewMode === viewModes.COMPACT;
}
