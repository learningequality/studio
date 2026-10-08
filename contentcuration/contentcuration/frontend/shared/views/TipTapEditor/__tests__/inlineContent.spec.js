import { useEditor } from '../TipTapEditor/composables/useEditor';
import { toInlineHTML } from '../TipTapEditor/utils/inlineContent';

describe('toInlineHTML', () => {
  let editors = [];

  // Read back through an inline-only editor: its parser collapses the whitespace
  // the unwrapped blocks leave, so what it holds is the outcome that matters.
  const flatten = html => {
    const { initializeEditor, editor } = useEditor();
    initializeEditor(toInlineHTML(html), 'edit', { inlineOnly: true });
    editors.push(editor.value);
    return editor.value.getHTML();
  };

  afterEach(() => {
    editors.forEach(editor => editor.destroy());
    editors = [];
  });

  it.each([
    ['paragraphs', '<p>a</p><p>b</p>', 'a b'],
    ['headings', '<h1>a</h1><h2>b</h2>', 'a b'],
    ['list items', '<ul><li>a</li><li>b</li></ul>', 'a b'],
    ['nested list items', '<ul><li><p>a</p><ul><li><p>b</p></li></ul></li></ul>', 'a b'],
    ['table cells', '<table><tr><td>a</td><td>b</td></tr></table>', 'a b'],
    ['divs', '<div>a</div><div>b</div>', 'a b'],
    [
      'small text blocks',
      '<small class="small-text">a</small><small class="small-text">b</small>',
      'a b',
    ],
    ['centered blocks', '<center>a</center><center>b</center>', 'a b'],
    ['details', '<details><summary>a</summary>b</details>', 'a b'],
    ['dialogs', '<dialog>a</dialog><dialog>b</dialog>', 'a b'],
    ['menus', '<menu><li>a</li></menu><menu><li>b</li></menu>', 'a b'],
    ['search blocks', '<search>a</search><search>b</search>', 'a b'],
    ['indented blocks', '<ul>\n  <li>a</li>\n  <li>\n    b\n  </li>\n</ul>\n', 'a b'],
    ['a code block', '<pre><code>a\nb</code></pre>', '<code>a b</code>'],
  ])('joins %s with a single space', (_, html, expected) => {
    expect(flatten(html)).toBe(expected);
  });

  it('keeps the inline content of a block', () => {
    const inline =
      '<strong>b</strong> <em>i</em> <sub>s</sub> <sup>S</sup> <code>c</code> x ' +
      '<span style="text-decoration: underline;">u</span> <span data-latex="x^2"></span>';

    expect(flatten(`<p>${inline}</p>`)).toBe(inline);
  });

  it('keeps inline small text in place', () => {
    expect(flatten('<p>fine <small>print</small> here</p>')).toBe('fine print here');
  });

  it.each([
    ['', '<p>a<br></p><p>b</p>'],
    [' followed by whitespace', '<p>a<br>\n</p><p>b</p>'],
  ])("drops a block's trailing break%s", (_, html) => {
    expect(flatten(html)).toBe('a b');
  });

  it.each([
    ['a<br>b', 'a b'],
    ['<p>a<br>b</p>', 'a b'],
    ['<p>a<br><span data-latex="x"></span></p>', 'a <span data-latex="x"></span>'],
  ])('turns the line break in %j into a space', (html, expected) => {
    expect(flatten(html)).toBe(expected);
  });

  it('keeps the space between math and the text beside it', () => {
    const inline = '<span data-latex="x"></span> and <span data-latex="y"></span>';

    expect(flatten(`<p>${inline}</p>`)).toBe(inline);
  });

  it('separates a block from math that starts the next block', () => {
    expect(flatten('<p>a</p><p><span data-latex="x"></span> is it</p>')).toBe(
      'a <span data-latex="x"></span> is it',
    );
  });

  it.each([
    ['an image', '<p>a</p><img src="x.png"><p>b</p>'],
    ['a horizontal rule', '<p>a</p><hr><p>b</p>'],
    ['a horizontal rule between runs of text', 'a<hr>b'],
  ])('drops %s', (_, html) => {
    expect(flatten(html)).toBe('a b');
  });
});
