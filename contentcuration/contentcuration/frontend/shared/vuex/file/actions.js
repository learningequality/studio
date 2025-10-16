import { cleanFile } from './clean';
import { getHash, extractMetadata, storageUrl } from './utils';
import { File } from 'shared/data/resources';
import client from 'shared/client';
import { fileErrors, NOVALUE } from 'shared/constants';
import FormatPresetsMap from 'shared/leUtils/FormatPresets';

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

export function updateFile(context, { id, ...payload }) {
  if (!id) {
    throw ReferenceError('id must be defined to update a file');
  }
  const fileData = generateFileData(payload);

  context.commit('ADD_FILE', { id, ...fileData });
  return File.update(id, fileData).then(() => {
    // Remove files with same preset/language combination
    if (fileData.contentnode) {
      const presetObj = FormatPresetsMap.get(fileData.preset);
      const files = context.getters.getContentNodeFiles(fileData.contentnode);
      for (const f of files) {
        if (
          f.preset.id === presetObj.id &&
          (!presetObj.multi_language || f.language.id === fileData.language) &&
          f.id !== id
        ) {
          context.dispatch('deleteFile', f);
        }
      }
    }
    return { id, ...fileData };
  });
}

export function deleteFile(context, file) {
  return File.delete(file.id).then(() => {
    context.commit('REMOVE_FILE', file);
  });
}

export function hexToBase64(str) {
  return btoa(
    String.fromCharCode.apply(
      null,
      str
        .replace(/\r|\n/g, '')
        .replace(/([\da-fA-F]{2}) ?/g, '0x$1 ')
        .replace(/ +$/, '')
        .split(' '),
    ),
  );
}

export function uploadFileToStorage(
  context,
  { id, file_format, mightSkip, checksum, file, url, contentType },
) {
  return (mightSkip ? client.head(storageUrl(checksum, file_format)) : Promise.reject())
    .then(() => {
      context.commit('ADD_FILE', {
        id,
        loaded: file.size,
        total: file.size,
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
            context.commit('ADD_FILE', {
              id,
              // Always assign loaded to a maximum of 1 less than the total
              // to prevent progress being shown as 100% until the upload has
              // completed
              loaded: Math.min(progressEvent.loaded, progressEvent.total - 1),
              total: progressEvent.total,
            });
          },
        })
        .then(() => {
          // Set download progress to 100% now as we have confirmation of the
          // completion of the file upload by the put request completing.
          context.commit('ADD_FILE', {
            id,
            loaded: file.size,
            total: file.size,
          });
        });
    });
}

/**
 * @return {Promise<{uploadPromise: Promise, fileObject: Object}>}
 */
export async function uploadFile(context, { file, preset = null } = {}) {
  const file_format = file.name.split('.').pop().toLowerCase();
  file = await cleanFile(file, preset);
  const hashPromise = getHash(file).catch(() => Promise.reject(fileErrors.CHECKSUM_HASH_FAILED));
  let checksum,
    metadata = {};

  return Promise.all([hashPromise, extractMetadata(file, preset)])
    .then(([fileChecksum, fileMetadata]) => {
      checksum = fileChecksum;
      metadata = fileMetadata;

      // 2. Get the upload url
      return File.uploadUrl({
        checksum,
        size: file.size,
        type: file.type,
        name: file.name,
        file_format,
        ...metadata,
      }).catch(error => {
        let errorType = fileErrors.UPLOAD_FAILED;
        if (error.response && error.response.status === 412) {
          errorType = fileErrors.NO_STORAGE;
        }
        return Promise.reject(errorType);
      }); // End get upload url
    })
    .then(data => {
      data.file.metadata = metadata;
      const fileObject = {
        ...data.file,
        loaded: 0,
        total: file.size,
      };
      context.commit('ADD_FILE', fileObject);

      // Asynchronously generate file preview
      setTimeout(() => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          if (reader.result) {
            context.commit('ADD_FILE', {
              id: data.file.id,
              previewSrc: reader.result,
            });
          }
        };
      }, 0);

      // 3. Upload file
      const uploadPromise = context
        .dispatch('uploadFileToStorage', {
          id: fileObject.id,
          checksum,
          file,
          file_format,
          url: data['uploadURL'],
          contentType: data['mimetype'],
          mightSkip: data['might_skip'],
        })
        .then(() => fileObject)
        .catch(() => {
          // Update vuex with failure
          context.commit('ADD_FILE', {
            id: fileObject.id,
            loaded: 0,
            error: fileErrors.UPLOAD_FAILED,
          });
          return Promise.reject(fileErrors.UPLOAD_FAILED);
        });
      // End upload file
      return { fileObject, uploadPromise };
    })
    .catch(error => {
      // If error isn't one of defined error constants, raise it
      if (!Object.values(fileErrors).includes(error)) {
        throw error;
      }
      const fileObject = {
        checksum,
        loaded: 0,
        total: file.size,
        file_size: file.size,
        original_filename: file.name,
        file_format,
        preset: metadata.preset,
        error,
      };
      context.commit('ADD_FILE', fileObject);
      return { fileObject, uploadPromise: Promise.reject(error) };
    });
}

export function getAudioData(context, url) {
  return new Promise((resolve, reject) => {
    client
      .get(url, { responseType: 'arraybuffer' })
      .then(response => {
        const audioContext = new AudioContext();
        audioContext
          .decodeAudioData(response.data, buffer => {
            resolve(buffer.getChannelData(0));
          })
          .catch(reject);
      })
      .catch(reject);
  });
}

export function downloadFile(context, { url, fileName }) {
  const anchor = document.createElement('a');
  anchor.download = fileName;
  anchor.href = url;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
