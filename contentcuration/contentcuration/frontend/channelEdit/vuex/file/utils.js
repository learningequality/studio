import SparkMD5 from 'spark-md5';
import { ValidationErrors } from '../../constants';

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

/**
 * Validate node files - correct types, no associated errors, etc.
 * @param {Array} files An array of files for a node.
 * @returns {Array} An array of error codes.
 */
export function validateNodeFiles(files) {
  let errors = files.filter(f => f.error).map(f => f.error.type);
  let validPrimaryFiles = files.filter(f => !f.error && !f.preset.supplementary);

  if (!validPrimaryFiles.length) {
    errors.push(ValidationErrors.NO_VALID_PRIMARY_FILES);
  }
  return errors;
}

/**
 * Sanitize node's files
 *  - removes current uploads
 *  - removes files that failed to upload
 * @param {Array} files An array of files
 * @returns {Array} Cleaned list of files
 */
export function sanitizeFiles(files) {
  return files.filter(f => !f.error && f.progress === undefined);
}
