import { getTipTapEditorStrings } from '../TipTapEditorStrings';
import { cleanFile } from 'shared/vuex/file/clean';
import { getHash, extractMetadata, storageUrl } from 'shared/vuex/file/utils';
import { hexToBase64 } from 'shared/vuex/file/actions';
import { File } from 'shared/data/resources';
import client from 'shared/client';
import { fileErrors } from 'shared/constants';
import { FormatPresetsNames } from 'shared/leUtils/FormatPresets';

const MAX_FILE_SIZE_MB = 10;
// see: shared/leUtils/FormatPresets.js
const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];

const {
  noFileProvided$,
  invalidFileType$,
  fileTooLarge$,
  fileSizeUnit$,
  failedToProcessImage$,
  noEnoughStorageSpace$,
} = getTipTapEditorStrings();

/**
 * Validates a file based on type, size, and available storage.
 * @param {File} file - The file to validate.
 * @param {number} availableSpace - Available storage space in bytes.
 * @returns {{isValid: boolean, error?: string}}
 */
function validateFile(file, availableSpace = null) {
  if (!file) {
    return { isValid: false, error: noFileProvided$() };
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: invalidFileType$() + ACCEPTED_MIME_TYPES.join(', '),
    };
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return {
      isValid: false,
      error: fileTooLarge$() + MAX_FILE_SIZE_MB + fileSizeUnit$(),
    };
  }

  if (availableSpace !== null && file.size > availableSpace) {
    return {
      isValid: false,
      error: noEnoughStorageSpace$(),
    };
  }

  return { isValid: true };
}

/**
 * Uploads file to storage (adapted from actions.js).
 * @param {Object} params - Upload parameters.
 * @returns {Promise}
 */
function uploadFileToStorage({ file_format, mightSkip, checksum, file, url, contentType }) {
  return (mightSkip ? client.head(storageUrl(checksum, file_format)) : Promise.reject())
    .then(() => {
      // File already exists, complete immediately
    })
    .catch(() => {
      return client.put(url, file, {
        headers: {
          'Content-Type': contentType,
          'Content-MD5': hexToBase64(checksum),
        },
      });
    });
}

/**
 * Main file processing function that uploads to server.
 * Adapted from uploadFile action but simplified for image-specific use.
 * @param {File} file - The image file to process.
 * @param {Object} context - Vue component context with $store access.
 * @returns {Promise<{src: string, width: number, height: number, file: File, id: string}>}
 */
async function processFile(file, context = null) {
  let availableSpace = null;

  // Get available space if context is provided
  if (context && context.$store) {
    await context.$store.dispatch('fetchUserStorage');
    availableSpace = context.$store.getters.availableSpace;
  }

  const validation = validateFile(file, availableSpace);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const file_format = file.name.split('.').pop().toLowerCase();
    const cleanedFile = await cleanFile(file, FormatPresetsNames.EXERCISE_IMAGE);

    // Get file hash and metadata
    const [checksum, metadata] = await Promise.all([
      getHash(cleanedFile).catch(() => Promise.reject(fileErrors.CHECKSUM_HASH_FAILED)),
      extractMetadata(cleanedFile, FormatPresetsNames.EXERCISE_IMAGE),
    ]);

    // Get upload URL from server
    const uploadData = await File.uploadUrl({
      checksum,
      size: cleanedFile.size,
      type: cleanedFile.type,
      name: cleanedFile.name,
      file_format,
      ...metadata,
    }).catch(error => {
      let errorType = fileErrors.UPLOAD_FAILED;
      if (error.response && error.response.status === 412) {
        errorType = fileErrors.NO_STORAGE;
      }
      throw errorType;
    });

    const fileObject = {
      ...uploadData.file,
      metadata,
    };

    // Upload file to storage
    await uploadFileToStorage({
      id: fileObject.id,
      checksum,
      file: cleanedFile,
      file_format,
      url: uploadData.uploadURL,
      contentType: uploadData.mimetype,
      mightSkip: uploadData.might_skip,
    });

    // Return data in expected format for ImageUploadModal
    return {
      src: storageUrl(checksum, file_format),
      width: metadata.width || null,
      height: metadata.height || null,
      file: file,
      id: fileObject.id,
      checksum,
      fileObject, // Include full file object for additional data
    };
  } catch (error) {
    // Handle specific error types
    if (error === fileErrors.NO_STORAGE) {
      throw new Error('Not enough storage space available');
    } else if (error === fileErrors.CHECKSUM_HASH_FAILED) {
      throw new Error('Failed to process file checksum');
    } else if (Object.values(fileErrors).includes(error)) {
      throw new Error(failedToProcessImage$() + ': ' + error);
    } else {
      throw new Error(failedToProcessImage$() + ': ' + error.message);
    }
  }
}

const EditorImageProcessor = {
  ACCEPTED_MIME_TYPES,
  processFile,
};

export default EditorImageProcessor;
