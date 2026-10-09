import { hasRichTextContent } from '../richText';

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
