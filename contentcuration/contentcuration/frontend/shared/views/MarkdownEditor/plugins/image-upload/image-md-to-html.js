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
  const matches = [...markdown.matchAll(IMAGE_REGEX)];
  matches.forEach(match => {
    // Make sure the exercise placeholder is there
    const mdImage = match[0];
    markdown = markdown.replace(mdImage, imageMdToImageFieldHTML(mdImage));
  });

  return markdown;
};
