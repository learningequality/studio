/**
 * Helper function that converts all image HTML representations
 *
 * E.g.
 * "
 *  What is this picture of?
 *    <span is='markdown-image-node'>![alt-text](${placeholer}/checksum.ext)</span>
 * "
 * will be converted to
 * "
 *  What is this picture of?
 *    ![alt-text](${placeholer}/checksum.ext)
 * "
 *
 */

export default html => {
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(html, 'text/html');
  const mdImages = doc.querySelectorAll('span[is="markdown-image-node"]');

  for (const mdImageEl of mdImages) {
    mdImageEl.replaceWith(mdImageEl.innerHTML);
    // const imageEl = mdImageEl.firstElementChild;
    // const src = imageEl.getAttribute('src').split('/').lastItem;
    // const alt = imageEl.getAttribute('alt');
    // const width = imageEl.getAttribute('width');
    // const height = imageEl.getAttribute('height');
    // if (width && width !== 'auto' && height && height !== 'auto') {
    //   mdImageEl.replaceWith(`![${alt}](${IMAGE_PLACEHOLDER}/${src} =${width}x${height})</span>`);
    // } else {
    //   mdImageEl.replaceWith(`![${alt}](${IMAGE_PLACEHOLDER}/${src})`);
    // }
  }

  const editOptionButtons = doc.querySelectorAll('.ignore-md');
  for (const editOptionsEl of editOptionButtons) {
    editOptionsEl.remove();
  }
  return doc.body.innerHTML;
};
