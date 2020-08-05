/**
 * Convert images to their HTML representation
 * E.g. ![text]({placeholder}/filename =10x20)
 *    should be <img alt="text" src="path/to/filename" width="10" height="20">
 */

import { IMAGE_PLACEHOLDER } from '../../constants';

// Min length for images (e.g. ![](placeholder/checksum.ext))
const CHECKSUM_LENGTH = 32;
const IMAGE_MIN_LENGTH = IMAGE_PLACEHOLDER.length + CHECKSUM_LENGTH + 6;
const IMAGE_REGEX = /!\[([^\]]*)]\(([^/]+\/([^\s]+))(?:\s=([0-9.]+)x([0-9.]+))*\)/g;

const EXCLAMATION_MARK = 33;

const image = state => {
  const startPos = state.pos;
  const maxPos = state.posMax;

  // no need to continue - if this condition is satisfied, it means that
  // we are approaching content end and at this point, no other image
  // can fit in as minimal image length is IMAGE_MIN_LENGTH characters
  if (maxPos - startPos < IMAGE_MIN_LENGTH) {
    return false;
  }

  if (state.src.charCodeAt(startPos) !== EXCLAMATION_MARK) {
    return false;
  }

  const markdownString = state.src.slice(startPos, maxPos);
  // Create a new regexp object to avoid getting every other occurrence
  const imageMatch = new RegExp(IMAGE_REGEX).exec(markdownString);

  // Don't process non-image strings
  if (!imageMatch || imageMatch[0].indexOf(IMAGE_PLACEHOLDER) === -1) {
    return false;
  }

  const imagePath = `/content/storage/${imageMatch[3][0]}/${imageMatch[3][1]}/`;
  const imageSrc = imageMatch[2].replace(IMAGE_PLACEHOLDER, imagePath);

  let token;
  token = state.push('image-upload', 'img', 1); // type, tag, nesting
  token.markup = imageMatch[0];
  token.content = '';
  token.attrs = [
    ['alt', imageMatch[1]],
    ['src', imageSrc],
    ['data-md', imageMatch[0]],
  ];

  // Add width and height if available
  if (imageMatch.length > 3) {
    token.attrs.push(['width', imageMatch[4]]);
  }
  if (imageMatch.length > 4) {
    token.attrs.push(['height', imageMatch[5]]);
  }

  // Skip position to ahead of image
  state.pos = startPos + imageMatch[0].length;
  return true;
};

const imagePlugin = md => {
  md.inline.ruler.push('imageUpload', image);
};

export default imagePlugin;
