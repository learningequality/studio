import flatMap from 'lodash/flatMap';
import { storageUrl } from './utils';
import FormatPresets from 'shared/leUtils/FormatPresets';
import Languages from 'shared/leUtils/Languages';

export function getFileUpload(state) {
  return function (id) {
    const fileUpload = state.fileUploadsMap[id];
    if (fileUpload) {
      return {
        ...fileUpload,
        ..._fileProgress(fileUpload),
        ..._parseFile(fileUpload),
      };
    }
    return null;
  };
}

function _fileProgress(fileUpload) {
  const progressCalc = fileUpload.loaded / fileUpload.total;
  const progress = isFinite(progressCalc) && !isNaN(progressCalc) ? progressCalc : undefined;
  return {
    loaded: fileUpload.loaded,
    total: fileUpload.total,
    error: fileUpload.error,
    progress: progress,
    // Add this flag so that we can quickly check that an upload
    // is in progress, when this is mixed into the data for a
    // regular file object
    uploading: !isNaN(progress) && progress < 1,
  };
}

function _parseFile(file) {
  const preset = file.preset.id || file.preset;
  const language = file.language && (file.language.id || file.language);
  const url = storageUrl(file.checksum, file.file_format);
  return {
    preset: FormatPresets.get(preset),
    language: Languages.get(language),
    url,
  };
}

function parseFileObject(state, file) {
  if (file) {
    const fileUpload = state.fileUploadsMap[file.id];
    return {
      ...file,
      ...(fileUpload ? _fileProgress(fileUpload) : {}),
      ..._parseFile(file),
    };
  }
  return null;
}

export function getContentNodeFileById(state) {
  return function (contentNodeId, fileId) {
    const file = (state.contentNodeFilesMap[contentNodeId] || {})[fileId];
    if (file) {
      return parseFileObject(state, file);
    }
  };
}

export function getContentNodeFiles(state) {
  return function (contentNodeId) {
    return Object.values(state.contentNodeFilesMap[contentNodeId] || {})
      .map(f => parseFileObject(state, f))
      .filter(f => f);
  };
}

export function contentNodesAreUploading(state) {
  return contentNodeIds => {
    return flatMap(contentNodeIds, contentNodeId => getContentNodeFiles(state)(contentNodeId)).some(
      file => file.uploading,
    );
  };
}

export function contentNodesTotalSize(state) {
  return contentNodeIds => {
    return flatMap(contentNodeIds, contentNodeId =>
      getContentNodeFiles(state)(contentNodeId),
    ).reduce((sum, f) => sum + f.file_size, 0);
  };
}
