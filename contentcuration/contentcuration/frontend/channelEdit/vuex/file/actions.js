import { getHash } from './utils';
import { File as ContentFile } from 'shared/data/resources';
import client from 'shared/client';
import { fileErrors } from 'frontend/channelEdit/constants';
import { FormatPresets, NOVALUE } from 'shared/constants';

const UPLOAD_DONE_DELAY = 1500;

export function loadFiles(context, params = {}) {
  return ContentFile.where(params).then(files => {
    context.commit('ADD_FILES', files);
    return files;
  });
}

export function loadFile(context, id) {
  return ContentFile.get(id)
    .then(file => {
      context.commit('ADD_FILE', file);
      return file;
    })
    .catch(() => {
      return;
    });
}

export function createFile(context, { file, presetId }) {
  let extension = file.name
    .split('.')
    .pop()
    .toLowerCase();
  let preset =
    presetId ||
    FormatPresets.find(
      ftype => ftype.allowed_formats.includes(extension.toLowerCase()) && ftype.display
    ).id;
  let user = context.rootState.session.currentUser;
  let uploadfile = {
    preset,
    progress: 0,
    file_size: file.size,
    original_filename: file.name,
    file_format: extension,
    uploaded_by: user && user.id,
  };
  return ContentFile.put(uploadfile).then(id => {
    context.commit('ADD_FILE', { id, ...uploadfile });
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
  context.commit('UPDATE_FILE', { id, ...fileData });
  return ContentFile.update(id, fileData);
}

export function getUploadURL(context, payload) {
  return client.get(
    window.Urls.get_upload_url(),
    { params: payload },
    {
      headers: {
        'Content-type': 'application/form-url-encode',
      },
    }
  );
}

export function uploadFileToStorage(context, { id, file, url }) {
  const data = new FormData();
  data.append('file', file);
  return client.post(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: progressEvent => {
      let progress = (progressEvent.loaded / progressEvent.total) * 100;
      context.commit('UPDATE_FILE', { id, progress });
      return ContentFile.update(id, { progress });
    },
  });
}

export function uploadFile(context, { id, file }) {
  return new Promise((resolve, reject) => {
    // 1. Get the checksum of the file
    getHash(file)
      .then(checksum => {
        context.dispatch('updateFile', { id, checksum });

        // 2. Get the upload url
        return context
          .dispatch('getUploadURL', { id, checksum, size: file.size })
          .then(response => {
            if (!response) {
              reject(fileErrors.UPLOAD_FAILED);
              return;
            }
            // 3. Upload file
            return context
              .dispatch('uploadFileToStorage', { id, file, url: response.data })
              .then(response => {
                context.dispatch('updateFile', {
                  id,
                  file_on_disk: response.data,
                });

                setTimeout(() => {
                  context.commit('UPDATE_FILE', { id, progress: undefined });
                  ContentFile.update(id, { progress: undefined });
                }, UPLOAD_DONE_DELAY);
                resolve(response.data);
              })
              .catch(() => {
                reject(fileErrors.UPLOAD_FAILED);
              }); // End upload file
          })
          .catch(error => {
            switch (error.response && error.response.status) {
              case 418:
                reject(fileErrors.NO_STORAGE);
                break;
              default:
                reject(fileErrors.UPLOAD_FAILED);
            }
          }); // End get upload url
      })
      .catch(() => {
        reject(fileErrors.UPLOAD_FAILED);
      }); // End get hash
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
