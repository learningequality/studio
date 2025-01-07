import SparkMD5 from 'spark-md5';
import JSZip from 'jszip';
import { FormatPresetsList, FormatPresetsNames } from 'shared/leUtils/FormatPresets';
import { LicensesList } from 'shared/leUtils/Licenses';
import LanguagesMap from 'shared/leUtils/Languages';

const BLOB_SLICE = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
const CHUNK_SIZE = 2097152;
const EXTRACTABLE_PRESETS = [
  FormatPresetsNames.AUDIO,
  FormatPresetsNames.HIGH_RES_VIDEO,
  FormatPresetsNames.LOW_RES_VIDEO,
  FormatPresetsNames.H5P,
];
export const VIDEO_PRESETS = [FormatPresetsNames.HIGH_RES_VIDEO, FormatPresetsNames.LOW_RES_VIDEO];
const THUMBNAIL_PRESETS = [
  FormatPresetsNames.AUDIO_THUMBNAIL,
  FormatPresetsNames.CHANNEL_THUMBNAIL,
  FormatPresetsNames.DOCUMENT_THUMBNAIL,
  FormatPresetsNames.EXERCISE_IMAGE,
  FormatPresetsNames.EXERCISE_THUMBNAIL,
  FormatPresetsNames.H5P_THUMBNAIL,
  FormatPresetsNames.HTML5_THUMBNAIL,
  FormatPresetsNames.QTI_THUMBNAIL,
  FormatPresetsNames.SLIDESHOW_IMAGE,
  FormatPresetsNames.SLIDESHOW_THUMBNAIL,
  FormatPresetsNames.TOPIC_THUMBNAIL,
  FormatPresetsNames.VIDEO_THUMBNAIL,
  FormatPresetsNames.ZIM_THUMBNAIL,
];

export const IMAGE_PRESETS = THUMBNAIL_PRESETS.concat([
  FormatPresetsNames.EXERCISE_IMAGE,
  FormatPresetsNames.SLIDESHOW_IMAGE,
]);

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

export const extensionPresetMap = FormatPresetsList.reduce((map, value) => {
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

const AuthorFieldMappings = {
  Author: 'author',
  Editor: 'aggregator',
  Licensee: 'copyright_holder',
  Originator: 'provider',
};

export async function getH5PMetadata(fileInput) {
  const zip = new JSZip();
  const metadata = {};
  return zip
    .loadAsync(fileInput)
    .then(function(zip) {
      const h5pJson = zip.file('h5p.json');
      if (h5pJson) {
        return h5pJson.async('text');
      } else {
        throw new Error('h5p.json not found in the H5P file.');
      }
    })
    .then(function(h5pContent) {
      const data = JSON.parse(h5pContent);
      if (Object.prototype.hasOwnProperty.call(data, 'title')) {
        metadata.title = data['title'];
      }
      if (
        Object.prototype.hasOwnProperty.call(data, 'language') &&
        LanguagesMap.has(data['language']) &&
        data['language'] !== 'und'
      ) {
        metadata.language = data['language'];
      }
      if (Object.prototype.hasOwnProperty.call(data, 'authors')) {
        for (const author of data['authors']) {
          // Ignore obvious placedholders created by online H5P editor tools
          if (author.role && author.name !== 'Firstname Surname') {
            if (AuthorFieldMappings[author.role]) {
              metadata[AuthorFieldMappings[author.role]] = author.name;
            }
          }
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'license')) {
        const license = LicensesList.find(license => license.license_name === data['license']);
        if (license) {
          metadata.license = license.id;
        } else if (data['license'] == 'CC0 1.0') {
          // Special case for CC0 1.0
          // this is the hard coded license id for CC0 1.0
          metadata.license = 8;
        }
      }
      return metadata;
    });
}

export function inferPreset(file, presetHint) {
  if (presetHint) {
    return presetHint;
  }
  const fileFormat = file.name
    .split('.')
    .pop()
    .toLowerCase();
  return extensionPresetMap?.[fileFormat]?.[0];
}

/**
 * @param {{name: String, preset: String}} file
 * @param {String|null} preset
 * @return {Promise<{preset: String, duration:Number|null}>}
 */
export function extractMetadata(file, preset = null) {
  const metadata = {
    preset: inferPreset(file, preset),
  };

  // End here if we cannot infer further metadata from the file type
  if (!EXTRACTABLE_PRESETS.includes(metadata.preset)) {
    return Promise.resolve(metadata);
  }

  return new Promise(resolve => {
    if (FormatPresetsNames.H5P === metadata.preset) {
      getH5PMetadata(file).then(data => {
        Object.assign(metadata, data);
      });
      resolve(metadata);
    } else {
      const isVideo = VIDEO_PRESETS.includes(metadata.preset);
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
