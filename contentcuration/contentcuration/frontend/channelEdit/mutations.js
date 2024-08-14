export function SET_VIEW_MODE(state, viewMode) {
  state.viewMode = viewMode;
}

export function SET_VIEW_MODE_OVERRIDES(state, overrides) {
  state.viewModeOverrides = overrides;
}

export function SET_SHOW_ABOUT_LICENSES(state, isOpen) {
  state.aboutLicensesModalOpen = isOpen;
}
