/**
 * Calculate the formulas menu position within markdown editor.
 * If the formulas menu is to be shown in the second half (horizontally)
 * of the editor, it's right corner should be clipped to the target
 * => this position of the right corner is returned as `right`.
 * Otherwise left corner is used to clip the menu and position
 * of the left corner is return as `left`.
 * Position is returned relative to editor element.
 *
 * @param {Object} editor Markdown editor element
 * @param {Number} targetX Viewport X position of a point in editor
 *                         to which formulas menu should be clipped to
 * @param {Number} targetY Viewport Y position of a point in editor
 *                         to which formulas menu should be clipped to
 */
export const getFormulasMenuPosition = ({ editorEl, targetX, targetY }) => {
  const editorWidth = editorEl.getBoundingClientRect().width;
  const editorTop = editorEl.getBoundingClientRect().top;
  const editorLeft = editorEl.getBoundingClientRect().left;
  const editorRight = editorEl.getBoundingClientRect().right;
  const editorMiddle = editorLeft + editorWidth / 2;

  const menuTop = targetY - editorTop;

  let menuLeft = null;
  let menuRight = null;

  if (targetX < editorMiddle) {
    menuLeft = targetX - editorLeft;
  } else {
    menuRight = editorRight - targetX;
  }

  return {
    top: menuTop,
    left: menuLeft,
    right: menuRight,
  };
};

/**
 * Extracts text content from document fragment
 *
 * @param {DocumentFragment} fragment
 */
export const getFragmentText = fragment => {
  let fragmentHTML = '';
  fragment.childNodes.forEach(childNode => {
    if (childNode.nodeType === childNode.TEXT_NODE) {
      fragmentHTML += childNode.textContent;
    } else {
      fragmentHTML += childNode.outerHTML;
    }
  });

  const doc = new DOMParser().parseFromString(fragmentHTML, 'text/html');
  const text = doc.body.textContent || '';

  return text;
};
