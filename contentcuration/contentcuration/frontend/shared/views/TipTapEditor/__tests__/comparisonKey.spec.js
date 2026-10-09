import { useEditor } from '../TipTapEditor/composables/useEditor';
import { richTextComparisonKey } from '../TipTapEditor/utils/comparisonKey';

describe('richTextComparisonKey', () => {
  it('reads through markup, so the same words marked up differently are one key', () => {
    expect(richTextComparisonKey('<p><strong>Par</strong>is</p>')).toBe(
      richTextComparisonKey('<p>Paris</p>'),
    );
  });

  it.each([
    ['bold', '<p>x<strong>2</strong></p>'],
    ['italic', '<p>x<em>2</em></p>'],
    ['underline', '<p>x<span style="text-decoration: underline">2</span></p>'],
    ['strikethrough', '<p>x<span style="text-decoration: line-through">2</span></p>'],
  ])('reads %s as the same text', (_, marked) => {
    expect(richTextComparisonKey(marked)).toBe(richTextComparisonKey('<p>x2</p>'));
  });

  it('keeps superscript, subscript and plain text apart', () => {
    const keys = ['<p>x<sup>2</sup></p>', '<p>x<sub>2</sub></p>', '<p>x2</p>'].map(
      richTextComparisonKey,
    );
    expect(new Set(keys).size).toBe(3);
  });

  it.each([
    ['formula', '<span data-latex="x^2"></span>', '<span data-latex="y^2"></span>'],
    ['image', '<img src="a.png"/>', '<img src="b.png"/>'],
    ['SVG', '<svg><circle r="1"/></svg>', '<svg><rect width="2"/></svg>'],
    ['MathML', '<math><mi>x</mi></math>', '<math><mi>y</mi></math>'],
  ])('keeps two different %s apart', (_, first, second) => {
    expect(richTextComparisonKey(`<p>${first}</p>`)).not.toBe(
      richTextComparisonKey(`<p>${second}</p>`),
    );
    expect(richTextComparisonKey(`<p>a ${first}</p>`)).not.toBe(
      richTextComparisonKey(`<p>a ${second}</p>`),
    );
  });

  it('reads the same SVG laid out differently as one', () => {
    expect(richTextComparisonKey('<p><svg><circle r="1"/></svg></p>')).toBe(
      richTextComparisonKey('<p>\n  <svg>\n    <circle r="1"/>\n  </svg>\n</p>'),
    );
  });

  it.each([
    ['formula', '<span data-latex="x^2"></span>'],
    ['MathML', '<math><mn>5</mn></math>'],
    ['SVG', '<svg><circle r="1"/></svg>'],
  ])('keeps the same text and %s apart when it moves', (_, media) => {
    expect(richTextComparisonKey(`<p>${media} cm</p>`)).not.toBe(
      richTextComparisonKey(`<p>cm ${media}</p>`),
    );
    expect(richTextComparisonKey(`<p>a${media}b</p>`)).not.toBe(
      richTextComparisonKey(`<p>ab${media}</p>`),
    );
  });

  it('keeps a formula apart from its LaTeX typed as text', () => {
    expect(richTextComparisonKey('<p>a <span data-latex="x^2"></span></p>')).not.toBe(
      richTextComparisonKey('<p>a x^2</p>'),
    );
  });

  it('keeps a formula apart from its key typed as text', () => {
    const key = richTextComparisonKey('<p>a <span data-latex="x^2"></span></p>');
    expect(richTextComparisonKey(`<p>${key}</p>`)).not.toBe(key);
  });

  describe.each([
    ['beside text', 'see '],
    ['alone', ''],
  ])('an image %s', (_, text) => {
    const key = image => richTextComparisonKey(`<p>${text}${image}</p>`);

    it.each([
      ['alt text', '<img src="a.png" alt="a cat"/>', '<img src="a.png" alt="a dog"/>'],
      ['alignment', '<img src="a.png"/>', '<img src="a.png" data-text-align="center"/>'],
      ['style', '<img src="a.png"/>', '<img src="a.png" style="text-align: center"/>'],
    ])('is kept apart when its %s differs', (_, first, second) => {
      expect(key(first)).not.toBe(key(second));
    });

    it('reads attribute order and the default alignment as the same image', () => {
      expect(key('<img alt="a cat" src="a.png">')).toBe(
        key('<img src="a.png" style="text-align: left" alt="a cat">'),
      );
    });

    it('reads the same image at another size as the same image', () => {
      expect(key('<img src="a.png" width="100" height="50"/>')).toBe(key('<img src="a.png"/>'));
    });

    it.each([
      ['title', '<img src="a.png" title="t"/>'],
      ['class', '<img src="a.png" class="wide"/>'],
      ['size style', '<img src="a.png" style="width: 50%"/>'],
      ['saved upload', '<img src="a.png" permanentsrc="https://storage/a.png"/>'],
    ])('with a %s it does not show reads as the same image', (_, other) => {
      expect(key(other)).toBe(key('<img src="a.png"/>'));
    });
  });

  it.each([
    ['formula', '<span data-latex="a"></span>', '<span data-latex="b"></span>'],
    ['image', '<img src="a.png"/>', '<img src="b.png"/>'],
    ['MathML', '<math><mi>a</mi></math>', '<math><mi>b</mi></math>'],
  ])('keeps the same code apart when its %s differs', (_, first, second) => {
    expect(richTextComparisonKey(`<pre><code>x ${first}</code></pre>`)).not.toBe(
      richTextComparisonKey(`<pre><code>x ${second}</code></pre>`),
    );
  });

  it('keeps the indentation of a code block', () => {
    expect(richTextComparisonKey('<pre><code>if x:\n    return 1</code></pre>')).not.toBe(
      richTextComparisonKey('<pre><code>if x:\n  return 1</code></pre>'),
    );
  });

  it.each([
    ['paragraphs', '<p>a</p><p>b</p>'],
    ['a line break', '<p>a<br>b</p>'],
    ['list items', '<ul><li>a</li><li>b</li></ul>'],
  ])('reads text split over %s as the same text on one line', (_, split) => {
    expect(richTextComparisonKey(split)).toBe(richTextComparisonKey('<p>ab</p>'));
  });

  it('reads text in a code block as the same text in a paragraph', () => {
    expect(richTextComparisonKey('<pre><code>ab</code></pre>')).toBe(
      richTextComparisonKey('<p>ab</p>'),
    );
  });

  it.each([
    ['a trailing', '<p>Paris&nbsp;</p>'],
    ['a leading', '<p>&nbsp;Paris</p>'],
    ['an empty paragraph of', '<p>Paris</p><p>&nbsp;</p>'],
    ['a line-break-ended', '<p>Paris&nbsp;<br>&nbsp;</p>'],
  ])('drops %s non-breaking space', (_, padded) => {
    expect(richTextComparisonKey(padded)).toBe(richTextComparisonKey('<p>Paris</p>'));
  });

  it.each([
    ['<p>Paris&nbsp;</p><p><img src="a.png"/></p>', '<p>Paris</p><p><img src="a.png"/></p>'],
    [
      '<p><span data-latex="x"></span>&nbsp;</p><p>a</p>',
      '<p><span data-latex="x"></span></p><p>a</p>',
    ],
  ])('drops a non-breaking space at the end of a line in %j', (padded, plain) => {
    expect(richTextComparisonKey(padded)).toBe(richTextComparisonKey(plain));
  });

  it('keeps a non-breaking space inside text apart from a space', () => {
    expect(richTextComparisonKey('<p>a&nbsp;b</p>')).not.toBe(richTextComparisonKey('<p>a b</p>'));
  });

  it('reads an entity in plain text as the character it stands for', () => {
    expect(richTextComparisonKey('Salt &amp; pepper')).toBe(
      richTextComparisonKey('<p>Salt &amp; pepper</p>'),
    );
  });

  describe('after TipTap rewraps it', () => {
    let editors = [];

    const rewrap = (html, edit = () => {}) => {
      const { initializeEditor, editor } = useEditor();
      initializeEditor(html);
      editors.push(editor.value);
      edit(editor.value);
      return editor.value.getHTML();
    };

    afterEach(() => {
      editors.forEach(editor => editor.destroy());
      editors = [];
    });

    it.each([
      '<p>see <img src="a.png"/> here</p>',
      '<p>\n  <img src="a.png"/>\n  caption\n</p>',
      '<p>see <img alt="a cat" src="H.png" /></p>',
      '<p>Solve\n  <span data-latex="x^2"></span>\n  for x</p>',
      '<p>a</p>\n<p><span data-latex="x"></span></p>',
      '<p>a</p>\n<p>\n  <span data-latex="x"></span>\n</p>',
      '<p>see <img src="a.png" title="t"/></p>',
      '<img src="a.png"/>',
      '<p><img alt="a cat" src="a.png"/></p>',
      '<p><img src="a.png" title="t"/></p>',
      '<pre><code>if x:\n    return 1</code></pre>',
      '<p>a<br>b</p>',
      '<p>a <br>\n  b</p>',
    ])('%j keys the same', stored => {
      expect(richTextComparisonKey(rewrap(stored))).toBe(richTextComparisonKey(stored));
    });

    it('keys an image sized when it loads the same as unsized', () => {
      const stored = '<p>see <img src="a.png"/></p>';
      // As ImageNodeView does once the image loads.
      const resizeImages = editor =>
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image') {
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, null, { ...node.attrs, width: 300, height: 200 }),
            );
          }
        });
      expect(richTextComparisonKey(rewrap(stored, resizeImages))).toBe(
        richTextComparisonKey(stored),
      );
    });
  });

  it('keeps the spaces around a formula', () => {
    expect(richTextComparisonKey('<p>a <span data-latex="x"></span> b</p>')).not.toBe(
      richTextComparisonKey('<p>a<span data-latex="x"></span>b</p>'),
    );
  });

  it.each([
    ['in text', '<p>a  b</p>', '<p>a b</p>'],
    [
      'beside a formula',
      '<p>a  <span data-latex="x"></span></p>',
      '<p>a <span data-latex="x"></span></p>',
    ],
  ])('collapses runs of whitespace %s', (_, run, single) => {
    expect(richTextComparisonKey(run)).toBe(richTextComparisonKey(single));
  });
});
