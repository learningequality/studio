import _ from 'underscore';
import Vue from 'vue';
import Constants from 'edit_channel/constants';
import client from 'shared/client';
import { fileErrors } from 'edit_channel/file_upload/constants';

const SparkMD5 = require('spark-md5');

const REMOVE_FILE_DELAY = 1500;
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
        return state.files[fileID];
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
  },
  mutations: {
    ADD_FILE(state, payload) {
      let fileID = payload.id;
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

      Vue.set(state.files, fileID, {
        id: fileID,
        previewSrc: null,
        progress: 0,
        error: null,
        hash: null,
        file_on_disk: null,
        name: fileparts.slice(0, fileparts.length - 1).join('.'),
        preset: preset,
        file_size: file.size,
        original_filename: file.name,
        kind: preset && preset.kind_id,
        file_format: extension,
      });
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
      return client.get(
        window.Urls.get_upload_url(),
        { params: payload },
        {
          headers: {
            'Content-type': 'application/form-url-encode',
          },
        }
      );
    },
    uploadFileToStorage(context, payload) {
      const data = new FormData();
      data.append('file', payload.file);
      return client.post(payload.url, data, {
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
                    context.commit('SET_FILE_PATH', {
                      id: payload.id,
                      path: response.data,
                    });

                    resolve(context.state.files[payload.id]);

                    setTimeout(() => {
                      context.commit('SET_FILE_UPLOAD_PROGRESS', {
                        id: payload.id,
                        progress: null,
                      });
                    }, REMOVE_FILE_DELAY);
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
    },
    getAudioData(context, url) {
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
    },
    generateThumbnail(context, filename) {
      return client.get(window.Urls.create_thumbnail(window.channel.id, filename));
    },
  },
};

module.exports = fileUploadsModule;
export default fileUploadsModule;
