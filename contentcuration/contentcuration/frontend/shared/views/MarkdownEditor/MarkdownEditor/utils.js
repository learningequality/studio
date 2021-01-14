/**
 * Clear DOM node by keeping only its text content.
 *
 * @param {Node} node
 * @param {Array} ignore An array of selectors. All nodes
 *                       corresponding to these selectors
 *                       won't be changed.
 */
export const clearNodeFormat = ({ node, ignore = [] }) => {
  let clonedNode = node.cloneNode(true);

  if (clonedNode.hasChildNodes()) {
    clonedNode.querySelectorAll('*').forEach(childNode => {
      childNode.parentNode.replaceChild(clearNodeFormat({ node: childNode, ignore }), childNode);
    });
  }

  if (
    clonedNode.nodeType === clonedNode.ELEMENT_NODE &&
    !ignore.some(selector => clonedNode.matches(selector))
  ) {
    const textNode = document.createTextNode(clonedNode.innerHTML);

    if (clonedNode.parentNode) {
      clonedNode.parentNode.replaceChild(textNode, clonedNode);
    } else {
      // use `document.createDocumentFragment` insted of `new DocumentFragment
      // otherwise Jest test for this helper would fail
      // https://github.com/jsdom/jsdom/issues/2274
      clonedNode = document.createDocumentFragment();
      clonedNode.appendChild(textNode);
    }
  }

  return clonedNode;
};

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
export const getExtensionMenuPosition = ({ editorEl, targetX, targetY }) => {
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
