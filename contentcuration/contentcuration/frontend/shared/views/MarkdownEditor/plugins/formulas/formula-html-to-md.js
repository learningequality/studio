/**
 * Convert all custom `markdown-formula-field` span elements from HTML
 * to markdown latex.
 *
 * Example:
 *
 * "
 *  Solve the following set of equations:
 *    <span is="markdown-formula-field">3x+5y=2</span>,
 *    <span is="markdown-formula-field">5x+8y=3</span>
 * "
 *
 * will be converted to
 *
 * "
 *  Solve the following set of equations:
 *    $$3x+5y=2$$,
 *    $$5x+8y=3$$
 * "
 *
 */

export default html => {
  if (!html || !html.includes('markdown-formula-field')) {
    return html;
  }

  const domParser = new DOMParser();
  const doc = domParser.parseFromString(html, 'text/html');

  const mathFieldsEls = doc.querySelectorAll('span[is="markdown-formula-field"]');

  for (const mathFieldEl of mathFieldsEls) {
    let formula = mathFieldEl.innerHTML;
    mathFieldEl.replaceWith('$$' + formula.trim() + '$$');
  }

  let newHtml = doc.body.innerHTML;
  return newHtml;
};
