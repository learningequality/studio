import SparkMD5 from 'spark-md5';
import { FormatPresetsList, FormatPresetsNames } from 'shared/leUtils/FormatPresets';

const BLOB_SLICE = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
const CHUNK_SIZE = 2097152;
const MEDIA_PRESETS = [
  FormatPresetsNames.AUDIO,
  FormatPresetsNames.HIGH_RES_VIDEO,
  FormatPresetsNames.LOW_RES_VIDEO,
];
const VIDEO_PRESETS = [FormatPresetsNames.HIGH_RES_VIDEO, FormatPresetsNames.LOW_RES_VIDEO];

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
  return `/content/storage/${checksum[0]}/${checksum[1]}/${checksum}.${file_format}`;
}

/**
 * @param {{name: String, preset: String}} file
 * @param {String|null} preset
 * @return {Promise<{preset: String, duration:Number|null}>}
 */
export function extractMetadata(file, preset = null) {
  const metadata = {
    preset: file.preset || preset,
  };

  if (!metadata.preset) {
    const fileFormat = file.name
      .split('.')
      .pop()
      .toLowerCase();
    // Default to whatever the first preset is
    metadata.preset = extensionPresetMap[fileFormat][0];
  }

  // End here if not audio or video
  if (!MEDIA_PRESETS.includes(metadata.preset)) {
    return Promise.resolve(metadata);
  }

  // Extract additional media metadata
  const isVideo = VIDEO_PRESETS.includes(metadata.preset);

  return new Promise(resolve => {
    const mediaElement = document.createElement(isVideo ? 'video' : 'audio');
    // Add a listener to read the metadata once it has loaded.
    mediaElement.addEventListener('loadedmetadata', () => {
      metadata.duration = Math.floor(mediaElement.duration);
      // Override preset based off video resolution
      if (isVideo) {
        metadata.preset =
          mediaElement.videoHeight >= 720
            ? FormatPresetsNames.HIGH_RES_VIDEO
            : FormatPresetsNames.LOW_RES_VIDEO;
      }
      resolve(metadata);
    });
    // Set the src url on the media element
    mediaElement.src = URL.createObjectURL(file);
  });
}
