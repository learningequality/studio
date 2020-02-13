import { mergeMapItem } from 'shared/vuex/utils';
import Constants from 'edit_channel/constants/index';

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

export function CREATE_FILE(state, payload) {
  let id = payload.id;
  let file = payload.file;
  let fileparts = file.name.split('.');
  let extension = _.last(fileparts).toLowerCase();

  let preset;
  if (payload.preset) {
    preset = Constants.FormatPresets.find(p => p.id === payload.preset);
  } else {
    preset = Constants.FormatPresets.find(ftype => {
      return ftype.allowed_formats.includes(extension.toLowerCase()) && ftype.display;
    });
  }
  let uploadfile = {
    id,
    preset,
    previewSrc: null,
    progress: 0,
    error: null,
    hash: null,
    file_on_disk: null,
    name: fileparts.slice(0, fileparts.length - 1).join('.'),
    file_size: file.size,
    original_filename: file.name,
    kind: preset && preset.kind_id,
    file_format: extension,
  };

  ADD_FILE(state, uploadfile);
}

// export function REMOVE_FILE(state, assessmentItem) {
//   Vue.delete(state.fileMap[assessmentItem.contentnode], assessmentItem.id);
// }
