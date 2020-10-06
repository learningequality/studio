/**
 * Convert images markdown to HTML
 *
 * Example
 *
 * "![alt-text](${placeholder}/checksum.ext =100x200)"
 *
 * will be converted to
 *
 * "<span is='markdown-image-field'>![alt-text](${placeholer}/checksum.ext =100x200)</span>"
 *
 */
import { IMAGE_REGEX, imageMdToImageFieldHTML } from './index';

// convert markdown images to image editor field custom elements

export default markdown => {
  return markdown.replace(IMAGE_REGEX, imageMd => imageMdToImageFieldHTML(imageMd));
};
