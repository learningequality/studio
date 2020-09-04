/**
 * Convert latex formulas to their simple HTML representation
 * that will be later processed by MathQuill
 *
 * Example
 *
 * "$$1_2$$"
 *
 * will be converted to
 *
 * "<span class="math-field">1_2</span>"
 *
 */

export default markdown => {
  return markdown.replace(/\$\$(.*?)\$\$/g, '<span class="math-field">$1</span>');
};
