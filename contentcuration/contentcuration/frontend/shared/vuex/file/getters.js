import flatMap from 'lodash/flatMap';
import { storageUrl } from './utils';
import FormatPresets from 'shared/leUtils/FormatPresets';
import Languages from 'shared/leUtils/Languages';

export function getFileUpload(state) {
  return function(id) {
    const fileUpload = state.fileUploadsMap[id];
    if (fileUpload) {
      return parseFileObject(fileUpload);
    }
  };
}

function parseFileObject(file) {
  if (file) {
    const preset = file.preset.id || file.preset;
    const language = file.language && (file.language.id || file.language);
    const url = storageUrl(file.checksum, file.file_format);
    const progressCalc = file.loaded / file.total;
    const progress = isFinite(progressCalc) && !isNaN(progressCalc) ? progressCalc : undefined;
    return {
      ...file,
      preset: FormatPresets.get(preset),
      language: Languages.get(language),
      url,
      progress: progress,
      // Add this flag so that we can quickly check that an upload
      // is in progress, when this is mixed into the data for a
      // regular file object
      uploading: !isNaN(progress) && progress < 1,
    };
  }
  return null;
}

export function getContentNodeFileById(state) {
  return function(contentNodeId, fileId) {
    const file = (state.contentNodeFilesMap[contentNodeId] || {})[fileId];
    if (file) {
      return parseFileObject(file);
    }
  };
}

export function getContentNodeFiles(state) {
  return function(contentNodeId) {
    return Object.values(state.contentNodeFilesMap[contentNodeId] || {})
      .map(parseFileObject)
      .filter(f => f);
  };
}

export function contentNodesAreUploading(state) {
  return contentNodeIds => {
    return flatMap(contentNodeIds, contentNodeId => getContentNodeFiles(state)(contentNodeId)).some(
      file => file.uploading
    );
  };
}

export function contentNodesTotalSize(state) {
  return contentNodeIds => {
    return flatMap(contentNodeIds, contentNodeId =>
      getContentNodeFiles(state)(contentNodeId)
    ).reduce((sum, f) => sum + f.file_size, 0);
  };
}
