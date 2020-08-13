/**
 * Convert latex formulas to their simple HTML representation
 * that will be later processed by MathQuill
 *
 * Example
 *
 * "![alt-text](${placeholer}/checksum.ext =100x200)"
 *
 * will be converted to
 *
 * "<img src='path/to/checksum.ext' alt='alt-text' width="100" height="200">"
 *
 */
import { IMAGE_PLACEHOLDER, CLASS_IMG_FIELD } from '../../constants';

const IMAGE_REGEX = /!\[([^\]]*)]\(([^/]+\/([^\s]+))(?:\s=([0-9.]+)x([0-9.]+))*\)/g;

export default markdown => {
  const matches = [...markdown.matchAll(IMAGE_REGEX)];
  matches.forEach(match => {
    // Make sure the exercise placeholder is there
    const imagePath = `/content/storage/${match[3][0]}/${match[3][1]}`;
    const src = match[2].replace(IMAGE_PLACEHOLDER, imagePath);
    const width = match[4] || 'auto';
    const height = match[5] || 'auto';
    const checksum = match[3].split('.')[0];
    markdown = markdown.replace(
      match[0],
      `<img alt="${match[1]}" src="${src}" width="${width}" height="${height}" class="${CLASS_IMG_FIELD}" data-checksum="${checksum}"/>`
    );
  });
  return markdown;
};
