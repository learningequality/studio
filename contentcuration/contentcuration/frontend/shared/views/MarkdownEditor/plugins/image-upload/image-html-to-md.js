/**
 * Convert images HTML to markdown
 *
 * E.g.
 *
 * "
 *  What is this picture of?
 *    <span is='markdown-image-field'>![alt-text](${placeholer}/checksum.ext)</span>
 * "
 *
 * will be converted to
 *
 * "
 *  What is this picture of?
 *    ![alt-text](${placeholder}/checksum.ext =100x200)
 * "
 *
 */

export default html => {
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(html, 'text/html');
  const mdImages = doc.querySelectorAll('span[is="markdown-image-field"]');

  for (const mdImageEl of mdImages) {
    mdImageEl.replaceWith(mdImageEl.innerHTML.trim());
  }

  const editOptionButtons = doc.querySelectorAll('.ignore-md');
  for (const editOptionsEl of editOptionButtons) {
    editOptionsEl.remove();
  }
  return doc.body.innerHTML;
};
