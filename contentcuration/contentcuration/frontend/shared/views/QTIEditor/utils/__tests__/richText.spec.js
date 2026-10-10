import { escapeText, hasRichTextContent, toPlainText } from '../richText';

describe('hasRichTextContent', () => {
  it.each([
    ['<p>text</p>', true],
    ['plain text', true],
    ['', false],
    [null, false],
    [undefined, false],
    ['   ', false],
    ['<p></p>', false],
    // The literal six characters a pattern strip leaves behind are not content.
    ['<p>&nbsp;</p>', false],
    // A prompt, choice or hint can be entirely an image or a formula — from a converted
    // legacy question, or from the editor's own image and formula buttons.
    ['<p><img src="abc123.png"/></p>', true],
    ['<p><img src="abc123.png" alt=""/></p>', true],
    // A formula is a data-latex span while it is being authored, and MathML once the
    // item has been published — an item can be read from either side of that.
    ['<p><span data-latex="x^2"></span></p>', true],
    ['<p><span class="math" data-latex="E=mc^2"></span></p>', true],
    // Content read from stored XML writes a `>` in an attribute value unescaped.
    ['<p><span title="a > b" data-latex="x"></span></p>', true],
    ['<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></p>', true],
    // The Math node writes no attribute for an empty formula, leaving nothing behind.
    ['<p><span></span></p>', false],
    ['<p><svg viewBox="0 0 1 1"></svg></p>', true],
    ['<p>see <img src="abc123.png"/></p>', true],
    // A converted legacy question carries its images in markdown, which is text.
    ['![](abc123.png =550x364)', true],
  ])('%s -> %s', (content, expected) => {
    expect(hasRichTextContent(content)).toBe(expected);
  });
});

describe('toPlainText', () => {
  it.each([
    ['Paris', 'Paris'],
    ['<p>Paris</p>', 'Paris'],
    ['<p></p>', ''],
    ['', ''],
    [null, ''],
    // Entities are decoded, not left as their literal characters.
    ['<p>a &amp; b&nbsp;c</p>', 'a & b c'],
  ])('reads %s as %s and loses nothing', (content, text) => {
    expect(toPlainText(content)).toEqual({ text, lost: false });
  });

  it.each([
    ['<p><strong>Paris</strong></p>', 'Paris'],
    ['<p>H<sub>2</sub>O</p>', 'H2O'],
    ['<p>first</p><p>second</p>', 'first second'],
    ['<p>first<br>second</p>', 'first second'],
    ['<ul><li>one</li><li>two</li></ul>', 'one two'],
  ])('reads %s as %s and says what plain text cannot hold is lost', (content, text) => {
    expect(toPlainText(content)).toEqual({ text, lost: true });
  });

  it.each([
    ['an image', '<p><img src="abc123.png"/></p>'],
    ['a formula', '<p><span data-latex="x^2"></span></p>'],
  ])('reads %s on its own as no text, and lost', (_, content) => {
    expect(toPlainText(content)).toEqual({ text: '', lost: true });
  });

  it('counts an empty paragraph after the text as no second line', () => {
    expect(toPlainText('<p>Paris</p><p></p>')).toEqual({ text: 'Paris', lost: false });
  });
});

describe('escapeText', () => {
  it('escapes markup, so it reads back as the same text', () => {
    expect(escapeText('a < b & <b>c</b>')).toBe('a &lt; b &amp; &lt;b&gt;c&lt;/b&gt;');
  });
});
