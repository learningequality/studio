/**
 * Convert latex formulas to their `markdown-formula` custom element
 * representation, which will render MathQuill in the shadow DOM.
 *
 * Example
 *
 * "$$1_2$$"
 *
 * will be converted to
 *
 * "<span is="markdown-formula">1_2</span>"
 *
 */

export default markdown => {
  return markdown.replace(/\$\$(.*?)\$\$/g, '<span is="markdown-formula">$1</span>');
};
