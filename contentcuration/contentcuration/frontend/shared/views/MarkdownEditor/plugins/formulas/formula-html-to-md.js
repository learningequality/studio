/**
 * Convert all custom `markdown-formula` span elements from HTML
 * to markdown latex.
 *
 * Example:
 *
 * "
 *  Solve the following set of equations:
 *    <span is="markdown-formula">3x+5y=2</span>,
 *    <span is="markdown-formula">5x+8y=3</span>
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
  if (!html || !html.includes('markdown-formula')) {
    return html;
  }

  const domParser = new DOMParser();
  const doc = domParser.parseFromString(html, 'text/html');

  const mathFieldsEls = doc.querySelectorAll('span[is="markdown-formula"]');

  for (const mathFieldEl of mathFieldsEls) {
    let formula = mathFieldEl.innerHTML;
    mathFieldEl.replaceWith('$$' + formula.trim() + '$$');
  }

  let newHtml = doc.body.innerHTML;
  return newHtml;
};
