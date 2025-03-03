/**
 * Convert latex formulas to their `markdown-formula-field` custom element
 * representation, which will render MathQuill in the shadow DOM.
 *
 * Example
 *
 * "$$1_2$$"
 *
 * will be converted to
 *
 * "<span is="markdown-formula-field">1_2</span>"
 *
 */

export default (markdown, editing) => {
  const editAttr = editing ? ' editing="true"' : '';
  return markdown.replace(
    /\$\$(.*?)\$\$/g,
    `<span is="markdown-formula-field"${editAttr}>$1</span>`,
  );
};
