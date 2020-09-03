import SparkMD5 from 'spark-md5';
import { FormatPresetsList, FormatPresetsNames } from 'shared/leUtils/FormatPresets';

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

const extensionPresetMap = FormatPresetsList.reduce((map, value) => {
  if (value.display) {
    value.allowed_formats.forEach(format => {
      if (!map[format]) {
        map[format] = [];
      }
      map[format].push(value.id);
    });
  }
  return map;
}, {});

// Returns the URL that points to the given file. This URL should
// be readable by the current user
export function storageUrl(checksum, file_format) {
  if (!checksum) {
    return '';
  }
  /*eslint no-undef: "error"*/
  return `${window.storageBaseUrl}${checksum[0]}/${checksum[1]}/${checksum}.${file_format}`;
}

export function inferPreset(file) {
  return new Promise(resolve => {
    if (file.preset) {
      resolve(file.preset);
    }
    const file_format = file.name
      .split('.')
      .pop()
      .toLowerCase();
    const inferredPresets = extensionPresetMap[file_format];
    if (inferredPresets && inferredPresets.length > 1) {
      // Special processing for inferring preset of videos
      if (
        inferredPresets.length === 2 &&
        inferredPresets.includes(FormatPresetsNames.HIGH_RES_VIDEO) &&
        inferredPresets.includes(FormatPresetsNames.LOW_RES_VIDEO)
      ) {
        const videoElement = document.createElement('video');
        const videoSource = URL.createObjectURL(file);
        // Add a listener to read the height from the video once
        // the metadata has loaded.
        videoElement.addEventListener('loadedmetadata', () => {
          if (videoElement.videoHeight >= 720) {
            resolve(FormatPresetsNames.HIGH_RES_VIDEO);
          } else {
            resolve(FormatPresetsNames.LOW_RES_VIDEO);
          }
        });
        // Set the src url on the video element
        videoElement.src = videoSource;
        // Return here to prevent subsequent processing
        return;
      }
    }
    resolve(inferredPresets && inferredPresets[0]);
  });
}
