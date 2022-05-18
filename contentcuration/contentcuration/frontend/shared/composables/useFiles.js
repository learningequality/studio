import { liveQuery } from 'dexie';

import client from 'shared/client';
import { createTranslator } from 'shared/i18n';
import { fileErrors, ONE_B, ONE_KB, ONE_MB, ONE_GB, ONE_TB, NOVALUE } from 'shared/constants';
import FormatPresets from 'shared/leUtils/FormatPresets';
import Languages from 'shared/leUtils/Languages';
import { File } from 'shared/data/resources';

const _sizeStrings = createTranslator('BytesForHumansStrings', {
  fileSizeInBytes: '{n, number, integer} B',
  fileSizeInKilobytes: '{n, number, integer} KB',
  fileSizeInMegabytes: '{n, number, integer} MB',
  fileSizeInGigabytes: '{n, number, integer} GB',
  fileSizeInTerabytes: '{n, number, integer} TB',
});

const _stringMap = {
  [ONE_B]: 'fileSizeInBytes',
  [ONE_KB]: 'fileSizeInKilobytes',
  [ONE_MB]: 'fileSizeInMegabytes',
  [ONE_GB]: 'fileSizeInGigabytes',
  [ONE_TB]: 'fileSizeInTerabytes',
};

const _statusStrings = createTranslator('StatusStrings', {
  uploadFileSize: '{uploaded} of {total}',
  uploadFailedError: 'Upload failed',
  noStorageError: 'Not enough space',
});

function _bytesForHumans(bytes) {
  bytes = bytes || 0;
  const unit = [ONE_TB, ONE_GB, ONE_MB, ONE_KB].find(x => bytes >= x) || ONE_B;
  return _sizeStrings.$tr(_stringMap[unit], { n: Math.round(bytes / unit) });
}

// Returns the URL that points to the given file. This URL should
// be readable by the current user
function _storageUrl(checksum, file_format) {
  if (!checksum) {
    return '';
  }
  /*eslint no-undef: "error"*/
  return `${window.storageBaseUrl}${checksum[0]}/${checksum[1]}/${checksum}.${file_format}`;
}

function _parseFile(file) {
  if (!file) {
    return null;
  }

  const progressCalc = file.loaded / file.total;
  const progress = isFinite(progressCalc) && !isNaN(progressCalc) ? progressCalc : undefined;
  const preset = file.preset.id || file.preset;
  const language = file.language && (file.language.id || file.language);
  const url = _storageUrl(file.checksum, file.file_format);

  return {
    ...file,
    loaded: file.loaded,
    total: file.total,
    error: file.error,
    progress: progress,
    // Add this flag so that we can quickly check that an upload
    // is in progress, when this is mixed into the data for a
    // regular file object
    uploading: !isNaN(progress) && progress < 1,
    preset: FormatPresets.get(preset),
    language: Languages.get(language),
    url,
  };
}

function _generateFileData({
  checksum = NOVALUE,
  file_size = NOVALUE,
  file_on_disk = NOVALUE,
  contentnode = NOVALUE,
  assessment_item = NOVALUE,
  slideshow_slide = NOVALUE,
  file_format = NOVALUE,
  preset = NOVALUE,
  language = NOVALUE,
  original_filename = NOVALUE,
  source_url = NOVALUE,
  error = NOVALUE,
} = {}) {
  const fileData = {};
  if (checksum !== NOVALUE) {
    fileData.checksum = checksum;
  }
  if (file_size !== NOVALUE) {
    fileData.file_size = file_size;
  }
  if (file_on_disk !== NOVALUE) {
    fileData.file_on_disk = file_on_disk;
    fileData.url = file_on_disk;
  }
  if (contentnode !== NOVALUE) {
    fileData.contentnode = contentnode;
  }
  if (assessment_item !== NOVALUE) {
    fileData.assessment_item = assessment_item;
  }
  if (slideshow_slide !== NOVALUE) {
    fileData.slideshow_slide = slideshow_slide;
  }
  if (file_format !== NOVALUE) {
    fileData.file_format = file_format;
  }
  if (preset !== NOVALUE) {
    fileData.preset = (preset || {}).id || preset;
  }
  if (language !== NOVALUE) {
    fileData.language = (language || {}).id || language;
  }
  if (original_filename !== NOVALUE) {
    fileData.original_filename = original_filename;
  }
  if (source_url !== NOVALUE) {
    fileData.source_url = source_url;
  }
  if (error !== NOVALUE) {
    fileData.error = error;
  }
  return fileData;
}

export default function useFiles() {
  function getFile(fileId) {
    return File.table.get(fileId).then(file => _parseFile(file));
  }

  function getContentNodeFiles(contentNodeId) {
    return File.table
      .where({ contentnode: contentNodeId })
      .toArray()
      .then(files => files.map(file => _parseFile(file)));
  }

  function updateFile({ id, ...payload }) {
    if (!id) {
      throw ReferenceError('id must be defined to update a file');
    }
    const fileData = _generateFileData(payload);
    return File.update(id, fileData).then(file => {
      // Remove files with same preset/language combination
      if (fileData.contentnode) {
        getContentNodeFiles(fileData.contentnode).then(files => {
          const presetObj = FormatPresets.get(fileData.preset);
          for (let f of files) {
            if (
              f.preset.id === presetObj.id &&
              (!presetObj.multi_language || f.language.id === fileData.language) &&
              f.id !== id
            ) {
              File.delete(f.id);
            }
          }
        });
      }
      return file;
    });
  }

  function getErrorMessage(file) {
    if (!file) {
      return;
    }
    if (file.error === fileErrors.NO_STORAGE) {
      return _statusStrings.$tr('noStorageError');
    } else if (file.error === fileErrors.UPLOAD_FAILED) {
      return _statusStrings.$tr('uploadFailedError');
    }
  }

  function getStatusMessage(file) {
    const errorMessage = getErrorMessage(file);
    if (errorMessage) {
      return errorMessage;
    }
    if (file && file.total) {
      return _statusStrings.$tr('uploadFileSize', {
        uploaded: _bytesForHumans(file.loaded),
        total: _bytesForHumans(file.total),
      });
    }
  }

  function formatFileSize(size) {
    return _bytesForHumans(size);
  }

  function fetchAudioData(url) {
    return new Promise((resolve, reject) => {
      client
        .get(url, { responseType: 'arraybuffer' })
        .then(response => {
          let audioContext = new AudioContext();
          audioContext
            .decodeAudioData(response.data, buffer => {
              resolve(buffer.getChannelData(0));
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  function subscribeNodesFiles(nodesIds, callback) {
    if (!nodesIds || !callback) {
      throw Error(
        '[useFiles][subscribeNodesFiles] Please provide both nodesIds and callback parameters'
      );
    }
    const query = liveQuery(() =>
      File.table
        .where('contentnode')
        .anyOf(nodesIds)
        .toArray()
    );
    const subscription = query.subscribe({
      next: files => {
        const parsedFiles = files.map(file => _parseFile(file));
        callback(parsedFiles);
      },
      error: error => console.error(error),
    });
    return subscription;
  }

  return {
    getFile,
    updateFile,
    getContentNodeFiles,
    getErrorMessage,
    getStatusMessage,
    formatFileSize,
    fetchAudioData,
    subscribeNodesFiles,
  };
}
