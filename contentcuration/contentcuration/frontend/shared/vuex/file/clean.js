import JSZip from 'jszip';
import { inferPreset } from './utils';
import { createPredictableZip, findCommonRoot } from 'shared/utils/zipFile';
import { FormatPresetsNames } from 'shared/leUtils/FormatPresets';

/**
 * Cleans an HTML5 zip file by removing unnecessary directory nesting
 * @param {File} file - The HTML5 zip file to clean
 * @returns {Promise<File>} - A promise that resolves to the cleaned file
 */
export async function cleanHTML5Zip(file) {
  // Load and process the zip file
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  // Find and remove common root directory
  const commonRoot = findCommonRoot(zipContent.files);
  const rootPrefix = commonRoot === '' ? '' : commonRoot + '/';
  const cleanedPaths = Object.entries(zipContent.files)
    .filter(([, entry]) => !entry.dir)
    .map(([path]) => path.slice(rootPrefix.length));

  // Create new predictable zip with cleaned files
  const cleanedZip = await createPredictableZip(cleanedPaths, path =>
    zipContent.files[rootPrefix + path].async('uint8array'),
  );

  // Create new File object with original metadata
  const cleanedFile = new File([cleanedZip], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });

  return cleanedFile;
}

/**
 * Cleans a file based on its format. Currently only supports HTML5 zip files.
 * Other files are passed through unchanged.
 * @param {File} file - The file to clean
 * @param {string} preset - The preset type of the file
 * @returns {Promise<File>} - A promise that resolves to the cleaned file
 */
export async function cleanFile(file, preset = null) {
  preset = inferPreset(file, preset);
  if (!preset) {
    return file; // Pass through files with unknown preset
  }

  // Clean file based on preset type
  if (preset === FormatPresetsNames.HTML5_ZIP) {
    return await cleanHTML5Zip(file);
  }

  // Pass through files with other presets unchanged
  return file;
}
