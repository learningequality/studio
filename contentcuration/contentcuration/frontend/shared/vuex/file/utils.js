import SparkMD5 from 'spark-md5';
import JSZip from 'jszip';
import { FormatPresetsList, FormatPresetsNames } from 'shared/leUtils/FormatPresets';
import { LicensesList } from 'shared/leUtils/Licenses';
import LanguagesMap from 'shared/leUtils/Languages';

const BLOB_SLICE = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
const CHUNK_SIZE = 2097152;
const MEDIA_PRESETS = [
  FormatPresetsNames.AUDIO,
  FormatPresetsNames.HIGH_RES_VIDEO,
  FormatPresetsNames.LOW_RES_VIDEO,
  FormatPresetsNames.QTI,
  FormatPresetsNames.HTML5_DEPENDENCY,
  FormatPresetsNames.HTML5_ZIP,
];
const VIDEO_PRESETS = [FormatPresetsNames.HIGH_RES_VIDEO, FormatPresetsNames.LOW_RES_VIDEO];
const H5P_PRESETS = [FormatPresetsNames.H5P];
const IMS_PRESETS = [
  FormatPresetsNames.QTI,
  FormatPresetsNames.HTML5_DEPENDENCY,
  FormatPresetsNames.HTML5_ZIP,
];

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

async function getFolderMetadata(data, xmlDoc, zip, procssedFiles) {
  const folders = [];
  if (data.length && data[0].children && data[0].children.length) {
    await Promise.all(
      Object.values(data[0].children).map(async orgNode => {
        const org = {
          title: '',
          files: [],
        };
        if (orgNode.nodeType === 1) {
          const title = orgNode.getElementsByTagName('title');
          org.title = title[0].textContent.trim();
          const files = orgNode.getElementsByTagName('item');
          const immediateChildNodes = [];
          const childNodes = Object.values(orgNode.children);
          Object.values(files).forEach(file => {
            if (childNodes.includes(file)) {
              immediateChildNodes.push(file);
            }
          });
          await Promise.all(
            immediateChildNodes.map(async (fileNode, k) => {
              const file = {};
              file.title = title[1 + k].textContent.trim();
              file.identifierref = fileNode.getAttribute('identifierref');
              file.resourceHref = xmlDoc
                .querySelectorAll(`[identifier=${file.identifierref}]`)[0]
                .getAttribute('href');
              if (fileNode.getElementsByTagName('organizations').length) {
                getFolderMetadata(
                  fileNode.getElementsByTagName('organizations'),
                  xmlDoc,
                  zip,
                  procssedFiles
                ).then(data => {
                  file.folders = data;
                });
              }
              const metadataNodes = orgNode.getElementsByTagName('metadata');
              if (metadataNodes && metadataNodes.length != 0) {
                Object.values(metadataNodes).forEach(nodeValue => {
                  file[`${nodeValue[0].nodeName}`] = nodeValue[0].textContent.replace(
                    / {2}|\r\n|\n|\r/gm,
                    ''
                  );
                });
              }
              org.files.push(file);
              const manifestPath =
                file.resourceHref.slice(0, file.resourceHref.lastIndexOf('/') + 1) +
                'imsmanifest.xml';
              const subManifestContent = zip.files[manifestPath];
              if (subManifestContent && !procssedFiles.includes(manifestPath)) {
                procssedFiles.push(manifestPath);
                const subManifestFile = await Promise.resolve(subManifestContent.async('text'));
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(subManifestFile, 'application/xml');
                const subManifestData = await getFolderMetadata(
                  xmlDoc.getElementsByTagName('organizations'),
                  xmlDoc,
                  zip,
                  procssedFiles
                );
                if (subManifestData.title) {
                  org.title = subManifestData[0].title;
                }
                subManifestData[0].files.map(file => {
                  org.files.push(file);
                });
              }
            })
          );
        }
        folders.push(org);
        return org;
      })
    );
    return folders;
  }
}

async function getManifestMetadata(manifestFile, zip, procssedFiles) {
  const metadata = {};
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(manifestFile, 'application/xml');
  const data = xmlDoc.getElementsByTagName('organizations');
  return await getFolderMetadata(data, xmlDoc, zip, procssedFiles).then(async data => {
    if (data) {
      metadata.folders = data;
    }
    const metadataFile = zip.file('imsmetadata.xml');
    if (metadataFile) {
      procssedFiles.push('imsmetadata.xml');
      const content = await Promise.resolve(metadataFile.async('text'));
      const xmlDoc = parser.parseFromString(content, 'application/xml');
      if (xmlDoc.getElementsByTagName('lomes:title').length) {
        metadata.title = xmlDoc
          .getElementsByTagName('lomes:title')[0]
          .children[0].textContent.trim();
      }
      if (
        xmlDoc.getElementsByTagName('lomes:idiom').length &&
        LanguagesMap.has(xmlDoc.getElementsByTagName('lomes:idiom')[0].textContent.trim()) &&
        xmlDoc.getElementsByTagName('lomes:idiom')[0].textContent.trim() !== 'und'
      ) {
        metadata.language = xmlDoc
          .getElementsByTagName('lomes:idiom')[0]
          .children[0].textContent.trim();
      }
      if (xmlDoc.getElementsByTagName('lomes:description').length) {
        metadata.description = xmlDoc
          .getElementsByTagName('lomes:description')[0]
          .children[0].textContent.trim();
      }
    } else {
      if (xmlDoc.getElementsByTagName('imsmd:title').length) {
        metadata.title = xmlDoc.getElementsByTagName('imsmd:title')[0].textContent.trim();
      }
      if (
        xmlDoc.getElementsByTagName('imsmd:language').length &&
        LanguagesMap.has(xmlDoc.getElementsByTagName('imsmd:language')[0].textContent.trim()) &&
        xmlDoc.getElementsByTagName('imsmd:language')[0].textContent.trim() !== 'und'
      ) {
        metadata.language = xmlDoc.getElementsByTagName('imsmd:language')[0].textContent.trim();
      }
      if (xmlDoc.getElementsByTagName('imsmd:description').length) {
        metadata.description = xmlDoc
          .getElementsByTagName('imsmd:description')[0]
          .textContent.trim();
      }
    }
    return metadata;
  });
}
export async function extractIMSMetadata(fileInput) {
  const zip = new JSZip();
  const procssedFiles = [];
  return zip
    .loadAsync(fileInput)
    .then(function(zip) {
      const manifestFile = zip.file('imsmanifest.xml');
      if (!manifestFile) {
        throw new Error('imsmanifest.xml not found in the zip file.');
      } else {
        procssedFiles.push('imsmanifest.xml');
        return manifestFile.async('text');
      }
    })
    .then(async manifestFile => {
      return await getManifestMetadata(manifestFile, zip, procssedFiles);
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
  const isIMSCP = IMS_PRESETS.includes(metadata.preset);
  // Extract additional media metadata
  const isVideo = VIDEO_PRESETS.includes(metadata.preset);

  return new Promise(resolve => {
    if (isH5P) {
      getH5PMetadata(file).then(data => {
        Object.assign(metadata, data);
      });
      resolve(metadata);
    } else if (isIMSCP) {
      extractIMSMetadata(file).then(data => {
        Object.assign(metadata, data);
      });
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
