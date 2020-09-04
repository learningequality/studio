import flatMap from 'lodash/flatMap';
import { storageUrl } from './utils';
import FormatPresets from 'shared/leUtils/FormatPresets';
import Languages from 'shared/leUtils/Languages';

export function getFileUpload(state) {
  return function(checksum) {
    const fileUpload = state.fileUploadsMap[checksum];
    if (fileUpload) {
      const progressCalc = fileUpload.loaded / fileUpload.total;
      const progress = isFinite(progressCalc) && !isNaN(progressCalc) ? progressCalc : undefined;
      const url = storageUrl(checksum, fileUpload.file_format);
      return {
        ...fileUpload,
        url,
        progress: progress,
        // Add this flag so that we can quickly check that an upload
        // is in progress, when this is mixed into the data for a
        // regular file object
        uploading: !isNaN(progress) && progress < 1,
      };
    }
  };
}

function parseFileObject(state, file) {
  if (file) {
    let preset = file.preset.id || file.preset;
    let language = file.language && (file.language.id || file.language);
    let url = storageUrl(file.checksum, file.file_format);
    return {
      ...(getFileUpload(state)(file.checksum) || {}),
      ...file,
      preset: FormatPresets.get(preset),
      language: Languages.get(language),
      url: url,
    };
  }
  return null;
}

export function getContentNodeFileById(state) {
  return function(contentNodeId, fileId) {
    const file = (state.contentNodeFilesMap[contentNodeId] || {})[fileId];
    if (file) {
      return parseFileObject(state, file);
    }
  };
}

export function getContentNodeFiles(state) {
  return function(contentNodeId) {
    return Object.values(state.contentNodeFilesMap[contentNodeId] || {})
      .map(file => parseFileObject(state, file))
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
