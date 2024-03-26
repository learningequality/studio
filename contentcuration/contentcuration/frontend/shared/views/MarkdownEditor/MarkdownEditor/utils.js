import * as Showdown from 'showdown';
import Editor from '@toast-ui/editor';
import { stripHtml } from 'string-strip-html';

import imagesHtmlToMd from '../plugins/image-upload/image-html-to-md';
import formulaHtmlToMd from '../plugins/formulas/formula-html-to-md';

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

export const generateCustomConverter = el => {
  // This is currently the only way of inheriting and adjusting
  // default TUI's convertor methods
  // see https://github.com/nhn/tui.editor/issues/615
  const tmpEditor = new Editor({ el });
  const showdown = new Showdown.Converter();
  const Convertor = tmpEditor.convertor.constructor;
  class CustomConvertor extends Convertor {
    toMarkdown(content) {
      content = showdown.makeMarkdown(content);
      content = imagesHtmlToMd(content);
      content = formulaHtmlToMd(content);
      // TUI.editor sprinkles in extra `<br>` tags that Kolibri renders literally
      // When showdown has already added linebreaks to render these in markdown
      // so we just remove these here.
      content = content.replaceAll('<br>', '');

      // any copy pasted rich text that renders as HTML but does not get converted
      // will linger here, so remove it as Kolibri will render it literally also.
      content = stripHtml(content).result;
      return content;
    }
    toHTML(content) {
      // Kolibri and showdown assume double newlines for a single line break,
      // wheras TUI.editor prefers single newline characters.
      content = content.replaceAll('\n\n', '\n');
      content = super.toHTML(content);
      return content;
    }
  }
  tmpEditor.remove();
  return CustomConvertor;
};
