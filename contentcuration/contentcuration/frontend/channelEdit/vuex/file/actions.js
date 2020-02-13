import { getHash } from './utils';
import { File as ContentFile } from 'shared/data/resources';
import client from 'shared/client';
import { fileErrors } from 'edit_channel/file_upload/constants';
import Constants from 'edit_channel/constants/index';

const UPLOAD_DONE_DELAY = 1500;

export function loadFiles(context, params = {}) {
  return ContentFile.where(params).then(files => {
    files.forEach(file => {
      file.preset = Constants.FormatPresets.find(p => p.id === file.preset);
    });

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

export function uploadFileToStorage(context, payload) {
  const data = new FormData();
  data.append('file', payload.file);
  return client.post(payload.url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: progressEvent => {
      const { loaded, total } = progressEvent;
      context.commit('UPDATE_FILE', {
        id: payload.id,
        progress: (loaded / total) * 100,
      });
    },
  });
}

export function uploadFile(context, payload) {
  return new Promise((resolve, reject) => {
    // 1. Get the checksum of the file
    getHash(payload.file)
      .then(hash => {
        context.commit('UPDATE_FILE', { id: payload.id, checksum: hash });

        // 2. Get the upload url
        context
          .dispatch('getUploadURL', { checksum: hash, size: payload.file.size, id: payload.id })
          .then(response => {
            if (!response) {
              reject(fileErrors.UPLOAD_FAILED);
              return;
            }
            // 3. Upload file
            context
              .dispatch('uploadFileToStorage', {
                id: payload.id,
                file: payload.file,
                url: response.data,
              })
              .then(response => {
                context.commit('UPDATE_FILE', {
                  id: payload.id,
                  file_on_disk: response.data,
                });

                setTimeout(() => {
                  context.commit('UPDATE_FILE', { id: payload.id, progress: undefined });
                }, UPLOAD_DONE_DELAY);
                resolve(response.data);
              })
              .catch(reject); // End upload file
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
      .catch(reject); // End get hash
  });
}
