import Vue from 'vue';
import { mergeMapItem } from 'shared/vuex/utils';

export function ADD_FILE(state, file) {
  if (!file.id) {
    return;
  }
  state.fileUploadsMap = mergeMapItem(state.fileUploadsMap || {}, file);
  // Get the merged item in case there is incomplete information in the file payload
  file = state.fileUploadsMap[file.id];
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
  Vue.delete(state.fileUploadsMap, file.id);
  if (file.assessment_item) {
    Vue.delete(state.assessmentItemFilesMap[file.assessment_item], file.id);
    return;
  }
  if (file.contentnode) {
    Vue.delete(state.contentNodeFilesMap[file.contentnode], file.id);
    return;
  }
}
