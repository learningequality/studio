import Vue from 'vue';
import { mergeMapItem } from 'shared/vuex/utils';

export function ADD_FILE(state, file) {
  if (!file.id) {
    return;
  }
  if (file.assessment_item) {
    Vue.set(
      state.assessmentItemFilesMap,
      file.assessment_item,
      mergeMapItem(state.assessmentItemFilesMap[file.assessment_item] || {}, file)
    );
    return;
  }
  if (file.contentnode) {
    Vue.set(
      state.contentNodeFilesMap,
      file.contentnode,
      mergeMapItem(state.contentNodeFilesMap[file.contentnode] || {}, file)
    );
    return;
  }
}

export function ADD_FILES(state, files = []) {
  files.forEach(file => {
    ADD_FILE(state, file);
  });
}

export function REMOVE_FILE(state, file) {
  if (!file.id) {
    return;
  }
  if (file.assessment_item) {
    Vue.delete(state.assessmentItemFilesMap[file.assessment_item], file.id);
    return;
  }
  if (file.contentnode) {
    Vue.delete(state.contentNodeFilesMap[file.contentnode], file.id);
    return;
  }
}

export function ADD_FILEUPLOAD(state, file) {
  if (!file.checksum) {
    throw ReferenceError('checksum must be defined to update a file upload');
  }
  state.fileUploadsMap = mergeMapItem(state.fileUploadsMap || {}, file);
}

export function REMOVE_FILEUPLOAD(state, file) {
  Vue.delete(state.fileUploadsMap, file.checksum);
}
