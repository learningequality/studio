export function setViewMode(context, viewMode) {
  context.commit('SET_VIEW_MODE', viewMode);
}

export function addViewModeOverride(context, { id, viewMode }) {
  const overrides = context.state.viewModeOverrides.slice();
  overrides.push({ id, viewMode });
  context.commit('SET_VIEW_MODE_OVERRIDES', overrides);
}

export function removeViewModeOverride(context, { id }) {
  const overrides = context.state.viewModeOverrides.slice();
  const index = overrides.reverse().findIndex(override => override.id === id);

  if (index === -1) {
    return;
  }

  overrides.splice(index, 1);
  context.commit('SET_VIEW_MODE_OVERRIDES', overrides.reverse());
}
