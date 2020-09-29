import './image-upload.css';
import { IMAGE_PLACEHOLDER } from '../../constants';
import imageUploadExtension from './image-upload.js';

export const IMAGE_REGEX = /!\[([^\]]*)]\(([^/]+\/([^\s]+))(?:\s=([0-9.]+)x([0-9.]+))*\)/g;
export const SINGLE_IMAGE_REGEX = /!\[([^\]]*)]\(([^/]+\/([^\s]+))(?:\s=([0-9.]+)x([0-9.]+))*\)/;

export const imageMdToParams = imageMd => {
  const match = imageMd.match(SINGLE_IMAGE_REGEX);
  if (!match) {
    return {};
  }
  const imagePath = `/content/storage/${match[3][0]}/${match[3][1]}`;
  const src = match[2].replace(IMAGE_PLACEHOLDER, imagePath);
  const width = match[4] || 'auto';
  const height = match[5] || 'auto';
  const checksum = match[3].split('.')[0];

  return { imageMd: match[0], imagePath, src, width, height, checksum };
};

export const paramsToImageMd = ({ src, alt, width, height }) => {
  src = src.split('/').lastItem;
  if (width && width !== 'auto' && height && height !== 'auto') {
    return `![${alt}](${IMAGE_PLACEHOLDER}/${src} =${width}x${height})`;
  } else {
    return `![${alt}](${IMAGE_PLACEHOLDER}/${src})`;
  }
};

export const imageMdToImageNodeHTML = imageMd => `<span is='markdown-image-node'>${imageMd}</span>`;
export const paramsToImageNodeHTML = params => imageMdToImageNodeHTML(paramsToImageMd(params));

export default imageUploadExtension;
