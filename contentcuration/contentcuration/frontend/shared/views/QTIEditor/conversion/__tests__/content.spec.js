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
