import SparkMD5 from 'spark-md5';
import JSZip from 'jszip';
import { FormatPresetsList, FormatPresetsNames } from 'shared/leUtils/FormatPresets';
import { LicensesList } from 'shared/leUtils/Licenses';
import LanguagesMap from 'shared/leUtils/Languages';
import JSZip from 'jszip';

const BLOB_SLICE = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
const CHUNK_SIZE = 2097152;
const MEDIA_PRESETS = [
  FormatPresetsNames.AUDIO,
  FormatPresetsNames.HIGH_RES_VIDEO,
  FormatPresetsNames.LOW_RES_VIDEO,
  FormatPresetsNames.QTI,
  FormatPresetsNames.HTML5_DEPENDENCY,
  FormatPresetsNames.HTML5_ZIP
];
const VIDEO_PRESETS = [FormatPresetsNames.HIGH_RES_VIDEO, FormatPresetsNames.LOW_RES_VIDEO];
const IMS_PRESETS = [FormatPresetsNames.QTI, FormatPresetsNames.HTML5_DEPENDENCY, FormatPresetsNames.HTML5_ZIP]

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

const getLeafNodes = (node) => {
  if (!node.children || node.children.length === 0) {
    return [node];
  }
  
  // Recursive case: Traverse all children and collect leaf nodes
  let leafNodes = [];
  for (let child of node.children) {
    const childLeafNodes = getLeafNodes(child);
    leafNodes = leafNodes.concat(childLeafNodes);
  }
  
  return leafNodes;
}

export async function extractIMSMetadata(fileInput, metadata){
  const zip = new JSZip();
  zip
    .loadAsync(fileInput)
    .then(function(zip) {
      const manifestFile = zip.file("imsmanifest.xml");
      const metadataFile = zip.file("imsmetadata.xml");
      if (!manifestFile) {
        reject(new Error("imsmanifest.xml not found in the zip file."));
        return;
      } else if(manifestFile && metadataFile){
        manifestFile
        .async("text")
        .then(content => {
          // Parse the XML content
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, "application/xml");
            const data = xmlDoc.getElementsByTagName('organizations')
            for( let i = 0 ; i < data.length; i++){
              let orgs = [];
              let index = 0;
              for( let j = 0 ; j < data[i].childNodes.length; j++){
                let org = []
                if(data[i].childNodes[j].nodeType === 1){
                  const orgNode = data[i].childNodes[j];
                  const title = orgNode.getElementsByTagName('title')
                  org.title = title[0].textContent
                  const items = orgNode.getElementsByTagName('item');
                  for(let k = 0; k < items.length; k++){
                    const file = {};
                    const item = items[k];
                    file.title = title[1+k].textContent;
                    file.identifierref = item.getAttribute('identifierref');
                    file.resourceHref = xmlDoc.querySelectorAll(`[identifier=${file.identifierref}]`)[0].getAttribute('href')
                    org[`file${index}`] = file;
                    index++;
                  }
                  orgs[`org${i}`] = org
                }
              }
              metadata.orgs = orgs
            }
          })
        metadataFile
          .async("text")
          .then(content=> {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, "application/xml");
            metadata.title = xmlDoc.getElementsByTagName('lomes:title').length === 0? undefined : xmlDoc.getElementsByTagName('lomes:title')[0].children[0].textContent;
            metadata.language = xmlDoc.getElementsByTagName("lomes:idiom").length === 0 ? undefined : xmlDoc.getElementsByTagName("lomes:idiom")[0].children[0].textContent;
            metadata.description = xmlDoc.getElementsByTagName("lomes:description").length === 0 ? undefined: xmlDoc.getElementsByTagName("lomes:description")[0].children[0].textContent;
          })
      } else {
        manifestFile
        .async("text")
        .then(content => {
          // Parse the XML content
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, "application/xml");
          metadata.title = xmlDoc.getElementsByTagName('title').length === 0? undefined : xmlDoc.getElementsByTagName('title')[0].textContent;
          metadata.language = xmlDoc.getElementsByTagName("imsmd:language").length === 0 ? undefined : xmlDoc.getElementsByTagName("imsmd:language")[0].textContent;
          metadata.description = xmlDoc.getElementsByTagName("imsmd:description").length === 0 ? undefined: xmlDoc.getElementsByTagName("imsmd:description")[0].textContent;
          const data = xmlDoc.getElementsByTagName('organizations')
          for( let i = 0 ; i < data.length; i++){
            let orgs = [];
            let index = 0;
            for( let j = 0 ; j < data[i].childNodes.length; j++){
              let org = []
              if(data[i].childNodes[j].nodeType === 1){
                const orgNode = data[i].childNodes[j];
                const title = orgNode.getElementsByTagName('title')
                org.title = title[0].textContent
                const items = orgNode.getElementsByTagName('item');
                for(let k = 0; k < items.length; k++){
                  const file = {};
                  const item = items[k];
                  file.title = title[1+k].textContent;
                  file.identifierref = item.getAttribute('identifierref');
                  file.resourceHref = xmlDoc.querySelectorAll(`[identifier=${file.identifierref}]`)[0].getAttribute('href')
                  const metadataNodes = orgNode.getElementsByTagName('metadata');
                  if(metadataNodes && metadataNodes.length != 0){
                    for( let l = 0 ; l < metadataNodes.length ; l++){
                      let nodeValue = getLeafNodes(metadataNodes[l]);
                      file[`${nodeValue[0].nodeName}`] = nodeValue[0].textContent
                    }
                  }
                  org[`file${index}`] = file;
                  index++;
                }
                orgs[`org${i}`] = org
              }
            }
            metadata.orgs = orgs
          }
          return metadata
        })
        .catch(error => {
          reject(error); 
        });
      }
    })
    .catch(error => {
      reject(error); // Failed to load the zip file
    });
  return metadata
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
      extractIMSMetadata(file, metadata)
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
