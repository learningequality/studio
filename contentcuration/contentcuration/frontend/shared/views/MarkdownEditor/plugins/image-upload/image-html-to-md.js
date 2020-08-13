/**
 * Helper function that converts all image HTML representations
 * to markdown based on `data-image` attribute contents.
 *
 * E.g.
 * "
 *  What is this picture of?
 *    <img src='path/to/checksum.ext' alt='alt-text'>
 * "
 * will be converted to
 * "
 *  What is this picture of?
 *    ![alt-text](${placeholer}/checksum.ext)
 * "
 *
 */

import { IMAGE_PLACEHOLDER } from '../../constants';

export default html => {
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(html, 'text/html');
  const images = doc.querySelectorAll('img');

  for (const imageEl of images) {
    const src = imageEl.getAttribute('src').split('/').lastItem;
    const alt = imageEl.getAttribute('alt');
    const width = imageEl.getAttribute('width');
    const height = imageEl.getAttribute('height');
    if (width && width !== 'auto' && height && height !== 'auto') {
      imageEl.replaceWith(`![${alt}](${IMAGE_PLACEHOLDER}/${src} =${width}x${height})`);
    } else {
      imageEl.replaceWith(`![${alt}](${IMAGE_PLACEHOLDER}/${src})`);
    }
  }

  const editOptionButtons = doc.querySelectorAll('.ignore-md');
  for (const editOptionsEl of editOptionButtons) {
    editOptionsEl.remove();
  }
  return doc.body.innerHTML;
};
