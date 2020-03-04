import { mergeMapItem } from 'shared/vuex/utils';

export function ADD_FILE(state, file) {
  // jayoshih: not mapping by contentnode id as we might be moving towards a
  // m2m model eventually, so mapping might change drastically
  if (!file.id) {
    throw ReferenceError('id must be defined to update a file');
  }
  // console.log(file.id, file.progress, file.file_on_disk);
  state.fileMap = mergeMapItem(state.fileMap, file);
}

export function ADD_FILES(state, files = []) {
  files.forEach(file => {
    ADD_FILE(state, file);
  });
}

export function UPDATE_FILE(state, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a file');
  }
  state.fileMap[id] = {
    ...state.fileMap[id],
    ...payload,
  };
}
