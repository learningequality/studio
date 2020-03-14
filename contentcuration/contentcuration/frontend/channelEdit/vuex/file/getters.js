// import sortBy from 'lodash/sortBy';
import reduce from 'lodash/reduce';
import { FormatPresets, Languages } from 'shared/constants';

export function getFile(state) {
  return function(fileId) {
    let file = state.fileMap[fileId];
    if (file) {
      let preset = file.preset.id || file.preset;
      let language = file.language && (file.language.id || file.language);
      return {
        ...file,
        preset: FormatPresets.find(p => p.id === preset),
        language: Languages.find(l => l.id === language),
      };
    }
    return null;
  };
}

export function getFiles(state) {
  return function(fileIds) {
    return fileIds.map(id => getFile(state)(id)).filter(f => f);
  };
}

export function getStatusMessage(state) {
  return fileIDs => {
    let match = getFiles(state)(fileIDs).find(f => f.error);
    return match && match.error.message;
  };
}

export function getUploadsInProgress(state) {
  return fileIDs => {
    return getFiles(state)(fileIDs).filter(f => f.progress !== undefined && !f.error);
  };
}

export function getProgress(state) {
  return fileIDs => {
    let files = getUploadsInProgress(state)(fileIDs);
    let uploadedSize = reduce(
      files,
      (sum, file) => {
        return (file.progress / 100) * file.file_size + sum;
      },
      0
    );
    let totalSize = reduce(
      files,
      (sum, f) => {
        return sum + f.file_size;
      },
      0
    );
    return { total: totalSize, uploaded: uploadedSize };
  };
}

export function getTotalSize(state) {
  return fileIDs => {
    let files = getFiles(state)(fileIDs).filter(f => f);
    return reduce(
      files,
      (sum, f) => {
        return sum + f.file_size;
      },
      0
    );
  };
}
