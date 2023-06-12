import SparkMD5 from 'spark-md5';
import JSZip from 'jszip';
import { FormatPresetsList, FormatPresetsNames } from 'shared/leUtils/FormatPresets';

const BLOB_SLICE = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
const CHUNK_SIZE = 2097152;
const MEDIA_PRESETS = [
  FormatPresetsNames.AUDIO,
  FormatPresetsNames.HIGH_RES_VIDEO,
  FormatPresetsNames.LOW_RES_VIDEO,
  FormatPresetsNames.H5P,
];
const VIDEO_PRESETS = [FormatPresetsNames.HIGH_RES_VIDEO, FormatPresetsNames.LOW_RES_VIDEO];
const H5P_PRESETS = [FormatPresetsNames.H5P];

export function getHash(file) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    const spark = new SparkMD5.ArrayBuffer();
    let currentChunk = 0;
    const chunks = Math.ceil(file.size / CHUNK_SIZE);
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

export async function getH5PMetadata(fileInput, metadata) {
  // const file = fileInput.files[0];
  // console.log(typeof(files), file);
  const zip = new JSZip();
  zip
    .loadAsync(fileInput)
    .then(function(zip) {
      const h5pJson = zip.file('h5p.json');
      // console.log(h5pJson);
      if (h5pJson) {
        return h5pJson.async('text');
      } else {
        throw new Error('h5p.json not found in the H5P file.');
      }
    })
    .then(function(h5pContent) {
      const data = JSON.parse(h5pContent);
      if (Object.prototype.hasOwnProperty.call(data, 'title')) {
        metadata.Title = data['title'];
      }
      if (Object.prototype.hasOwnProperty.call(data, 'language') && data['language'] !== 'und') {
        metadata.language = data['language'];
      }
      if (Object.prototype.hasOwnProperty.call(data, 'authors')) {
        metadata.author = data['authors'];
      }
      if (Object.prototype.hasOwnProperty.call(data, 'license')) {
        metadata.license = data['license'];
      }
    })
    .catch(function(error) {
      console.error('Error loading or extracting H5P file:', error);
    });
  return metadata;
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

  const isH5P = H5P_PRESETS.includes(metadata.preset);

  // Extract additional media metadata
  const isVideo = VIDEO_PRESETS.includes(metadata.preset);

  return new Promise(resolve => {
    if (isH5P) {
      getH5PMetadata(file, metadata);
      console.log(metadata);
      resolve(metadata);
    } else {
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
    }
  });
}
