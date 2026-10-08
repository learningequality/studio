// The elements an inline run cannot hold, whose content is kept and joined to its
// neighbours'. `small.small-text` is the full editor's Small block; a bare `small`
// is inline.
const BLOCK_SELECTOR =
  'address, article, aside, blockquote, canvas, center, dd, details, dialog, div, dl, dt, ' +
  'fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hgroup, ' +
  'legend, li, main, menu, nav, ol, output, p, pre, search, section, small.small-text, ' +
  'table, thead, tbody, tfoot, summary, tr, th, td, caption, ul';

// ProseMirror joins the text of adjacent blocks a schema cannot hold with nothing
// between them, so a space is put between each block and the content beside it.
// Each line break or rule becomes a space too; ProseMirror collapses the runs this leaves.
export function flattenBlocks(doc) {
  // ProseMirror parses a copy marked as its own with the copy's whitespace and block
  // depth, neither of which applies once flattened; unmarked, it collapses whitespace.
  // https://github.com/ProseMirror/prosemirror-view/blob/master/src/clipboard.ts
  doc.querySelectorAll('[data-pm-slice]').forEach(node => node.removeAttribute('data-pm-slice'));
  // A `col` or `colgroup` as the first tag makes ProseMirror read the paste as a table,
  // dropping its text.
  doc.body.querySelectorAll('colgroup, col').forEach(node => node.remove());
  const blocks = [...doc.querySelectorAll(BLOCK_SELECTOR)];
  doc.querySelectorAll('br, hr').forEach(node => node.replaceWith(' '));
  // Innermost first: unwrapping an outer block first moves its nested blocks out one
  // level at a time, which is quadratic in a pasted table.
  blocks.reverse().forEach(block => {
    if (block.previousSibling) block.before(' ');
    if (block.nextSibling) block.after(' ');
    block.replaceWith(...block.childNodes);
  });
}

export function toInlineHTML(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  flattenBlocks(doc);
  return doc.body.innerHTML;
}
