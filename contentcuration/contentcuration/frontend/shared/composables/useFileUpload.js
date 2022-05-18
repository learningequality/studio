import VueCompositionAPI, { ref } from '@vue/composition-api';
import Vue from 'vue';
import { hexToBase64, getHash, extractMetadata, storageUrl } from 'shared/utils/file';
import { File } from 'shared/data/resources';
import client from 'shared/client';
import { fileErrors } from 'shared/constants';

// https://github.com/vuejs/composition-api/issues/544
Vue.use(VueCompositionAPI);

const _fileUploads = ref({});

function _updateFileUpload(file) {
  const updatedFileUploads = {
    ..._fileUploads.value,
  };
  updatedFileUploads[file.id] = {
    ...(updatedFileUploads[file.id] || {}),
    ...file,
  };
  _fileUploads.value = updatedFileUploads;
}

export default function useFileUpload() {
  function getFileUpload(fileId) {
    if (!fileId) {
      return null;
    }
    return _fileUploads.value[fileId];
  }

  function deleteFileUpload(fileId) {
    if (!fileId) {
      return;
    }
    delete _fileUploads[fileId];
  }

  function uploadFile({ file, preset = null } = {}) {
    function uploadFileToStorage({ id, file_format, mightSkip, checksum, file, url, contentType }) {
      return (mightSkip ? client.head(storageUrl(checksum, file_format)) : Promise.reject())
        .then(() => {
          File.table.update(id, { loaded: file.size, total: file.size }).then(() => {
            deleteFileUpload(id);
          });
        })
        .catch(() => {
          return client
            .put(url, file, {
              headers: {
                'Content-Type': contentType,
                'Content-MD5': hexToBase64(checksum),
              },
              onUploadProgress: progressEvent => {
                // Always assign loaded to a maximum of 1 less than the total
                // to prevent progress being shown as 100% until the upload has
                // completed
                _updateFileUpload({
                  id,
                  loaded: Math.min(progressEvent.loaded, progressEvent.total - 1),
                  total: progressEvent.total,
                });
              },
            })
            .then(() => {
              // Set download progress to 100% now as we have confirmation of the
              // completion of the file upload by the put request completing.
              File.table.update(id, { loaded: file.size, total: file.size }).then(() => {
                deleteFileUpload(id);
              });
            });
        });
    }

    return new Promise((resolve, reject) => {
      // 1. Get the checksum of the file
      Promise.all([getHash(file), extractMetadata(file, preset)])
        .then(([checksum, metadata]) => {
          const file_format = file.name
            .split('.')
            .pop()
            .toLowerCase();
          // 2. Get the upload url
          File.uploadUrl({
            checksum,
            size: file.size,
            type: file.type,
            name: file.name,
            file_format,
            ...metadata,
          })
            .then(data => {
              const fileObject = {
                ...data.file,
                loaded: 0,
                total: file.size,
              };
              _updateFileUpload(fileObject);
              // 3. Upload file
              const promise = uploadFileToStorage({
                id: fileObject.id,
                checksum,
                file,
                file_format,
                url: data['uploadURL'],
                contentType: data['mimetype'],
                mightSkip: data['might_skip'],
              }).catch(() => {
                _updateFileUpload({
                  id: fileObject.id,
                  loaded: 0,
                  error: fileErrors.UPLOAD_FAILED,
                });
                return fileErrors.UPLOAD_FAILED;
              }); // End upload file
              // Resolve with a summary of the uploaded file
              // and a promise that can be chained from for file
              // upload completion
              resolve({ fileObject, promise });
              // Asynchronously generate file preview
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onloadend = () => {
                if (reader.result) {
                  _updateFileUpload({ id: data.file.id, previewSrc: reader.result });
                }
              };
            })
            .catch(error => {
              let errorType = fileErrors.UPLOAD_FAILED;
              if (error.response && error.response.status === 412) {
                errorType = fileErrors.NO_STORAGE;
              }
              const fileObject = {
                checksum,
                loaded: 0,
                total: file.size,
                file_size: file.size,
                original_filename: file.name,
                file_format,
                preset: metadata.preset,
                error: errorType,
              };
              resolve(fileObject);
            }); // End get upload url
        })
        .catch(() => {
          reject(fileErrors.CHECKSUM_HASH_FAILED);
        }); // End get hash
    });
  }

  return {
    getFileUpload,
    deleteFileUpload,
    uploadFile,
  };
}
