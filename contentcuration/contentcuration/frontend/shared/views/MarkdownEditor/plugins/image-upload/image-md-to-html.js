/**
 * Convert images markdown to HTML
 *
 * Example
 *
 * "![alt-text](${placeholer}/checksum.ext =100x200)"
 *
 * will be converted to
 *
 * "<span is='markdown-image-node'>![alt-text](${placeholer}/checksum.ext =100x200)</span>"
 *
 */
import { IMAGE_REGEX, imageMdToImageNodeHTML } from './index';

// convert an individual markdown image to a image editor node component

export const markdownToEditorNodes = markdown => {
  const matches = [...markdown.matchAll(IMAGE_REGEX)];
  matches.forEach(match => {
    // Make sure the exercise placeholder is there
    const mdImage = match[0];
    markdown = markdown.replace(mdImage, imageMdToImageNodeHTML(mdImage));
  });
  return markdown;
};

export default markdownToEditorNodes;
