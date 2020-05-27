import { getHash, inferPreset } from './utils';
import { File } from 'shared/data/resources';
import client from 'shared/client';
import { fileErrors, NOVALUE } from 'shared/constants';
import { FormatPresetsList } from 'shared/leUtils/FormatPresets';

export function loadFiles(context, params = {}) {
  return File.where(params).then(files => {
    context.commit('ADD_FILES', files);
    return files;
  });
}

export function loadFile(context, id) {
  return File.get(id)
    .then(file => {
      context.commit('ADD_FILE', file);
      return file;
    })
    .catch(() => {
      return;
    });
}

export function createFile(context, file) {
  const newFile = generateFileData({
    ...file,
    preset:
      file.preset ||
      FormatPresetsList.find(
        ftype => ftype.allowed_formats.includes(file.file_format) && ftype.display
      ),
  });
  newFile.uploaded_by = context.rootGetters.currentUserId;
  return File.put(newFile).then(id => {
    context.commit('ADD_FILE', { id, ...newFile });
    return id;
  });
}

function generateFileData({
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
  if (!contentnode || !assessment_item) {
    throw ReferenceError('Either contentnode or assessment_item must be defined to update a file');
  }
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
    fileData.preset = preset.id || preset;
  }
  if (language !== NOVALUE) {
    fileData.language = language.id || language;
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

export function updateFile(context, { id, ...payload }) {
  if (!id) {
    throw ReferenceError('id must be defined to update a file');
  }
  const fileData = generateFileData(payload);
  context.commit('ADD_FILE', { id, ...fileData });
  return File.update(id, fileData);
}

export function deleteFile(context, file) {
  return File.delete(file.id).then(() => {
    context.commit('REMOVE_FILE', file);
  });
}

function hexToBase64(str) {
    return btoa(String.fromCharCode.apply(null,
      str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
    );
}

export function uploadFileToStorage(context, { checksum, file, url }) {
  const data = new FormData();
  data.append('file', file);
  return client.post(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Content-MD5': hexToBase64(checksum),
    },
    onUploadProgress: progressEvent => {
      context.commit('ADD_FILEUPLOAD', {
        checksum,
        loaded: progressEvent.loaded,
        total: progressEvent.total,
      });
    },
  });
}

export function uploadFile(context, { file }) {
  return new Promise((resolve, reject) => {
    // 1. Get the checksum of the file
    Promise.all([getHash(file), inferPreset(file)])
      .then(([checksum, presetId]) => {
        const file_format = file.name
          .split('.')
          .pop()
          .toLowerCase();
        const fileUploadObject = {
          checksum,
          loaded: 0,
          total: file.size,
          file_size: file.size,
          original_filename: file.name,
          file_format,
          preset: presetId,
        };
        context.commit('ADD_FILEUPLOAD', fileUploadObject);
        // 2. Get the upload url
        client.post(
          window.Urls.upload_url(), { checksum, size: file.size, type: file.type, name: file.name }
          )
          .then(response => {
            if (!response) {
              reject(fileErrors.UPLOAD_FAILED);
              context.commit('ADD_FILEUPLOAD', {
                checksum,
                error: fileErrors.UPLOAD_FAILED,
              });
              return;
            }
            // 3. Upload file
            return context
              .dispatch('uploadFileToStorage', { checksum, file, url: response.data })
              .then(response => {
                context.commit('ADD_FILEUPLOAD', { checksum, file_on_disk: response.data });
              })
              .catch(() => {
                context.commit('ADD_FILEUPLOAD', {
                  checksum,
                  error: fileErrors.UPLOAD_FAILED,
                });
              }); // End upload file
          })
          .catch(error => {
            let errorType = fileErrors.UPLOAD_FAILED;
            if (error.response && error.response.status === 418) {
              errorType = fileErrors.NO_STORAGE;
            }
            context.commit('ADD_FILEUPLOAD', {
              checksum,
              error: errorType,
            });
          }); // End get upload url
        // Resolve with a summary of the uploaded file
        resolve(fileUploadObject);
      })
      .catch(() => {
        reject(fileErrors.CHECKSUM_HASH_FAILED);
      }); // End get hash
  });
}

export function copyFiles(context, { params, updater }) {
  return File.bulkCopy(params, updater).then(newFiles => {
    if (!newFiles.length) {
      return [];
    }

    context.commit('ADD_FILES', newFiles);
    return newFiles;
  });
}

export function getAudioData(context, url) {
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

export function generateThumbnail(context, filename) {
  let channel = context.rootGetters['currentChannel/currentChannel'];
  return client.get(window.Urls.create_thumbnail(channel.id, filename));
}
