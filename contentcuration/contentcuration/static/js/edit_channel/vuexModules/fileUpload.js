import _ from 'underscore';
import Vue from 'vue';
import Constants from 'edit_channel/constants';
import client from 'edit_channel/sharedComponents/client';
import { fileErrors } from 'edit_channel/file_upload/constants';

const SparkMD5 = require('spark-md5');

const REMOVE_FILE_DELAY = 2500;
const BLOB_SLICE = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
const CHUNK_SIZE = 2097152;

export function getHash(file) {
  return new Promise((resolve, reject) => {
    let fileReader = new FileReader();
    let spark = new SparkMD5.ArrayBuffer();
    let currentChunk = 0;
    let chunks = Math.ceil(file.size / CHUNK_SIZE);
    fileReader.onload = function(e) {
      spark.append(e.target.result);
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };
    fileReader.onerror = reject;

    function loadNext() {
      var start = currentChunk * CHUNK_SIZE,
        end = start + CHUNK_SIZE >= file.size ? file.size : start + CHUNK_SIZE;

      fileReader.readAsArrayBuffer(BLOB_SLICE.call(file, start, end));
    }

    loadNext();
  });
}

const fileUploadsModule = {
  namespaced: true,
  state: {
    files: {},
    queuedUploads: [],
  },
  getters: {
    getFile(state) {
      return fileID => {
        return _.findWhere(state.files, { id: fileID });
      };
    },
    getStatusMessage(state) {
      return fileIDs => {
        let matches = _.filter(state.files, f => fileIDs.includes(f.id) && f.error);
        if (matches.length) {
          return matches[0].error.message;
        }
      };
    },
    getProgress(state) {
      return fileIDs => {
        let files = _.filter(state.files, f => fileIDs.includes(f.id));
        let uploadedSize = _.reduce(
          files,
          (sum, file) => {
            return (file.progress / 100) * file.file_size + sum;
          },
          0
        );
        let totalSize = _.reduce(
          files,
          (sum, f) => {
            return sum + f.file_size;
          },
          0
        );
        return { total: totalSize, uploaded: uploadedSize };
      };
    },
    nextUpload(state) {
      return _.findWhere(_.values(state.files), { progress: 0 });
    },
  },
  mutations: {
    ADD_FILE(state, payload) {
      let fileID = payload.id;
      let file = payload.file;
      let fileparts = file.name.split('.');
      let extension = fileparts[fileparts.length - 1].toLowerCase();

      let preset;
      if (payload.preset) {
        preset = _.findWhere(Constants.FormatPresets, { id: payload.preset });
      } else {
        preset = _.find(Constants.FormatPresets, ftype => {
          return _.contains(ftype.allowed_formats, extension.toLowerCase()) && ftype.display;
        });
      }

      state.files[fileID] = {
        id: fileID,
        previewSrc: null,
        progress: 0,
        error: null,
        hash: null,
        file_on_disk: null,
        name: fileparts[0],
        preset: preset,
        file_size: file.size,
        original_filename: file.name,
        kind: preset && preset.kind_id,
        file_format: extension,
      };
    },
    REMOVE_FILE(state, fileID) {
      Vue.delete(state.files, fileID);
    },
    SET_FILE_UPLOAD_PROGRESS(state, payload) {
      state.files[payload.id].progress = payload.progress;
    },
    SET_FILE_CHECKSUM(state, payload) {
      state.files[payload.id].checksum = payload.checksum;
    },
    SET_FILE_ERROR(state, payload) {
      state.files[payload.id].error = {
        type: payload.error,
        message: payload.message,
      };
    },
    SET_FILE_PATH(state, payload) {
      state.files[payload.id].file_on_disk = payload.path;
    },
    SET_FILE_PREVIEW_SOURCE(state, payload) {
      state.files[payload.id].previewSrc = payload.previewSrc;
    },
  },
  actions: {
    getUploadURL(context, payload) {
      return new Promise((resolve, reject) => {
        client
          .get(
            window.Urls.get_upload_url(),
            { params: payload },
            {
              headers: {
                'Content-type': 'application/form-url-encode',
              },
            }
          )
          .then(resolve)
          .catch(error => {
            switch (error.response && error.response.status) {
              case 418:
                reject(fileErrors.NO_STORAGE);
                break;
              default:
                reject(fileErrors.UPLOAD_FAILED);
            }
          });
      });
    },
    uploadFileToStorage(context, payload) {
      return new Promise((resolve, reject) => {
        const data = new FormData();
        data.append('file', payload.file);
        client
          .post(payload.url, data, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: progressEvent => {
              const { loaded, total } = progressEvent;
              context.commit('SET_FILE_UPLOAD_PROGRESS', {
                id: payload.id,
                progress: (loaded / total) * 100,
              });
            },
          })
          .then(response => {
            context.commit('SET_FILE_PATH', {
              id: payload.id,
              path: response.data,
            });

            resolve(context.state.files[payload.id]);

            setTimeout(() => {
              context.commit('REMOVE_FILE', payload.id);
            }, REMOVE_FILE_DELAY);
          })
          .catch(reject);
      });
    },
    uploadFile(context, payload) {
      return new Promise((resolve, reject) => {
        // 1. Get the checksum of the file
        getHash(payload.file)
          .then(hash => {
            context.commit('SET_FILE_CHECKSUM', { id: payload.id, checksum: hash });

            // 2. Get the upload url
            context
              .dispatch('getUploadURL', { checksum: hash, size: payload.file.size, id: payload.id })
              .then(response => {
                // 3. Upload file
                context
                  .dispatch('uploadFileToStorage', {
                    id: payload.id,
                    file: payload.file,
                    url: response.data,
                  })
                  .then(response => {
                    resolve(response.data);
                  })
                  .catch(reject);
              })
              .catch(reject);
          })
          .catch(reject);
      });
    },
  },
};

module.exports = fileUploadsModule;
