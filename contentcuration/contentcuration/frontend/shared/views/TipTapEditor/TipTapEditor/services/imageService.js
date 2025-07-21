import { getTipTapEditorStrings } from '../TipTapEditorStrings';

const MAX_FILE_SIZE_MB = 10; // I think I need review on this value, I just picked what seemed reasonable
export const ACCEPTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];

const { noFileProvided$, invalidFileType$, fileTooLarge$, fileSizeUnit$, failedToProcessImage$ } =
  getTipTapEditorStrings();

/**
 * Validates a file based on type and size.
 * @param {File} file - The file to validate.
 * @returns {{isValid: boolean, error?: string}}
 */
export function validateFile(file) {
  if (!file) {
    return { isValid: false, error: noFileProvided$ };
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: invalidFileType$ + ACCEPTED_MIME_TYPES.join(', '),
    };
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return {
      isValid: false,
      error: fileTooLarge$ + MAX_FILE_SIZE_MB + fileSizeUnit$,
    };
  }
  return { isValid: true };
}

/**
 * Reads a file and returns it as a Data URL.
 * @param {File} file - The image file.
 * @returns {Promise<string>} A promise that resolves with the Data URL.
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Gets the natural dimensions of an image from its source.
 * @param {string} src - The image source (e.g., a Data URL).
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = error => reject(error);
    img.src = src;
  });
}

/**
 * Fully processes a file: validates, reads, and gets dimensions.
 * @param {File} file - The file to process.
 * @returns {Promise<{src: string, width: number, height: number, file: File}>}
 */
export async function processFile(file) {
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const src = await readFileAsDataURL(file);
    const { width, height } = await getImageDimensions(src);
    return { src, width, height, file };
  } catch (error) {
    throw new Error(failedToProcessImage$);
  }
}
