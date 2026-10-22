import { ContentLevel } from '../../constants';
import { changeContentLevel, hasContent } from '../content';

describe('hasContent', () => {
  it('reads plain text by its trimmed text', () => {
    expect(hasContent('  ', ContentLevel.PLAIN)).toBe(false);
    expect(hasContent(' a ', ContentLevel.PLAIN)).toBe(true);
    expect(hasContent(null, ContentLevel.PLAIN)).toBe(false);
  });

  it('counts an image or a formula as content in HTML', () => {
    expect(hasContent('<p></p>', ContentLevel.RICH)).toBe(false);
    expect(hasContent('<p><img src="a.png"/></p>', ContentLevel.RICH)).toBe(true);
    expect(hasContent('<span data-latex="x"></span>', ContentLevel.INLINE)).toBe(true);
  });
});

describe('changeContentLevel', () => {
  it('leaves content at the same level as it is', () => {
    expect(changeContentLevel('<p><b>a</b></p>', ContentLevel.RICH, ContentLevel.RICH)).toEqual({
      content: '<p><b>a</b></p>',
      lost: false,
    });
  });

  it('reads rich or inline content as plain text, saying when anything was lost', () => {
    expect(changeContentLevel('<p>Paris</p>', ContentLevel.RICH, ContentLevel.PLAIN)).toEqual({
      content: 'Paris',
      lost: false,
    });
    expect(changeContentLevel('<b>Paris</b>', ContentLevel.INLINE, ContentLevel.PLAIN)).toEqual({
      content: 'Paris',
      lost: true,
    });
  });

  const toPlain = content => changeContentLevel(content, ContentLevel.RICH, ContentLevel.PLAIN);

  it.each([
    ['Paris', 'Paris'],
    ['<p>Paris</p>', 'Paris'],
    ['<p></p>', ''],
    ['', ''],
    [null, ''],
    // Entities are decoded, not left as their literal characters.
    ['<p>a &amp; b&nbsp;c</p>', 'a & b c'],
  ])('reads %s as the plain text %s, losing nothing', (content, text) => {
    expect(toPlain(content)).toEqual({ content: text, lost: false });
  });

  it.each([
    ['<p><strong>Paris</strong></p>', 'Paris'],
    ['<p>H<sub>2</sub>O</p>', 'H2O'],
    ['<p>first</p><p>second</p>', 'first second'],
    ['<p>first<br>second</p>', 'first second'],
    ['<ul><li>one</li><li>two</li></ul>', 'one two'],
  ])(
    'reads %s as the plain text %s, saying what plain text cannot hold is lost',
    (content, text) => {
      expect(toPlain(content)).toEqual({ content: text, lost: true });
    },
  );

  it.each([
    ['an image', '<p><img src="abc123.png"/></p>'],
    ['a formula', '<p><span data-latex="x^2"></span></p>'],
  ])('reads %s on its own as no plain text, and lost', (_, content) => {
    expect(toPlain(content)).toEqual({ content: '', lost: true });
  });

  it('counts an empty paragraph after the text as no second line', () => {
    expect(toPlain('<p>Paris</p><p></p>')).toEqual({ content: 'Paris', lost: false });
  });

  it('puts plain text in a paragraph for rich content, escaped', () => {
    expect(changeContentLevel('a < b', ContentLevel.PLAIN, ContentLevel.RICH)).toEqual({
      content: '<p>a &lt; b</p>',
      lost: false,
    });
  });

  it('escapes plain text for inline content, with no paragraph around it', () => {
    expect(changeContentLevel('a < b', ContentLevel.PLAIN, ContentLevel.INLINE)).toEqual({
      content: 'a &lt; b',
      lost: false,
    });
    // Markup in plain text is text, so it reads back as the same text.
    expect(changeContentLevel('a < b & <b>c</b>', ContentLevel.PLAIN, ContentLevel.INLINE)).toEqual(
      { content: 'a &lt; b &amp; &lt;b&gt;c&lt;/b&gt;', lost: false },
    );
  });

  it('gives empty plain text no paragraph', () => {
    expect(changeContentLevel('  ', ContentLevel.PLAIN, ContentLevel.RICH)).toEqual({
      content: '',
      lost: false,
    });
  });

  it('refuses levels no question type family converts between', () => {
    expect(() => changeContentLevel('<p>a</p>', ContentLevel.RICH, ContentLevel.INLINE)).toThrow(
      /No conversion/,
    );
  });
});
