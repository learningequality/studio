export function resetJestGlobal() {
  // This global object is bootstraped into channel_edit.html and is
  // assumed by the frontend code for it
  global.window.CHANNEL_EDIT_GLOBAL = {
    channel_id: '',
    channel_error: '',
  };
}
