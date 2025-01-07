import { VIDEO_PRESETS, IMAGE_PRESETS, inferPreset } from './utils';
import { FormatPresetsNames } from 'shared/leUtils/FormatPresets';
import { findFirstHtml } from 'shared/utils/zipFile';

// Validation result codes
export const VALID = 0;
export const INVALID_UNREADABLE_FILE = 1;
export const INVALID_UNSUPPORTED_FORMAT = 2;
export const INVALID_HTML5_ZIP = 3;

const videoPresetsSet = new Set(VIDEO_PRESETS);
const imagePresetsSet = new Set(IMAGE_PRESETS);

/**
 * Validates an HTML5 zip file by checking for index.html
 * @param {File} file - The zip file to validate
 * @returns {Promise<number>} - Resolves to validation result code
 */
async function validateHTML5Zip(file) {
  try {
    const entryPoint = await findFirstHtml(file);
    return entryPoint ? VALID : INVALID_HTML5_ZIP;
  } catch (e) {
    return INVALID_UNREADABLE_FILE;
  }
}

/**
 * Validates an image file using an Image object
 * @param {string} objectUrl - Object URL for the media file
 * @returns {Promise<number>} - Resolves to result code
 */
function validateImage(objectUrl) {
  return new Promise(resolve => {
    const img = document.createElement('img');

    img.onload = () => resolve(VALID);
    img.onerror = () => resolve(INVALID_UNREADABLE_FILE);
    img.src = objectUrl;
  });
}
/**
 * Validates an audio file using an Audio object
 * @param {string} objectUrl - Object URL for the media file
 * @returns {Promise<number>} - Resolves to result code
 */
function validateAudio(objectUrl) {
  return new Promise(resolve => {
    const audio = document.createElement('audio');

    audio.onloadedmetadata = () => resolve(VALID);
    audio.onerror = () => resolve(INVALID_UNREADABLE_FILE);
    audio.src = objectUrl;
  });
}

/**
 * Validates a video file using a Video element
 * @param {string} objectUrl - Object URL for the media file
 * @returns {Promise<number>} - Resolves to result code
 */
function validateVideo(objectUrl) {
  return new Promise(resolve => {
    const video = document.createElement('video');

    video.onloadedmetadata = () => resolve(VALID);
    video.onerror = () => resolve(INVALID_UNREADABLE_FILE);
    video.src = objectUrl;
  });
}

/**
 * Validates a file is a supported preset and is valid
 * @param {File} file - The file to validate
 * @returns {Promise<number>} - Resolves to validation result code
 */
export async function validateFile(file) {
  // Get the preset definition
  const preset = inferPreset(file);
  if (!preset) {
    return INVALID_UNSUPPORTED_FORMAT;
  }

  if (preset === FormatPresetsNames.HTML5_ZIP) {
    return await validateHTML5Zip(file);
  }

  // Create object URL for validation if needed
  if (
    // Audio formats
    preset === FormatPresetsNames.AUDIO ||
    // Video formats
    videoPresetsSet.has(preset) ||
    // Image formats including thumbnails
    imagePresetsSet.has(preset)
  ) {
    const objectUrl = URL.createObjectURL(file);
    try {
      if (preset === FormatPresetsNames.AUDIO) {
        return await validateAudio(objectUrl);
      } else if (videoPresetsSet.has(preset)) {
        return await validateVideo(objectUrl);
      } else {
        // All remaining presets are image types
        return await validateImage(objectUrl);
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  // If no validation needed, return valid
  return VALID;
}
