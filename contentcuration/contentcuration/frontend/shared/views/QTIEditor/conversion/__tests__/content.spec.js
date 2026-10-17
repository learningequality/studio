import { ContentLevel } from '../../constants';
import { changeLevel, hasContent } from '../content';

const { RICH, INLINE, PLAIN } = ContentLevel;

describe('hasContent', () => {
  it('reads plain text by its trimmed text', () => {
    expect(hasContent('  ', PLAIN)).toBe(false);
    expect(hasContent(' a ', PLAIN)).toBe(true);
    expect(hasContent(null, PLAIN)).toBe(false);
  });

  it('counts an image or a formula as content in HTML', () => {
    expect(hasContent('<p></p>', RICH)).toBe(false);
    expect(hasContent('<p><img src="a.png"/></p>', RICH)).toBe(true);
    expect(hasContent('<span data-latex="x"></span>', INLINE)).toBe(true);
  });
});

describe('changeLevel', () => {
  it('leaves content at the same level as it is', () => {
    expect(changeLevel('<p><b>a</b></p>', RICH, RICH)).toEqual({
      content: '<p><b>a</b></p>',
      lost: false,
    });
  });

  it('reads rich or inline content as plain text, saying when anything was lost', () => {
    expect(changeLevel('<p>Paris</p>', RICH, PLAIN)).toEqual({ content: 'Paris', lost: false });
    expect(changeLevel('<b>Paris</b>', INLINE, PLAIN)).toEqual({ content: 'Paris', lost: true });
  });

  it('puts plain text in a paragraph for rich content, escaped', () => {
    expect(changeLevel('a < b', PLAIN, RICH)).toEqual({ content: '<p>a &lt; b</p>', lost: false });
  });

  it('escapes plain text for inline content, with no paragraph around it', () => {
    expect(changeLevel('a < b', PLAIN, INLINE)).toEqual({ content: 'a &lt; b', lost: false });
  });

  it('gives empty plain text no paragraph', () => {
    expect(changeLevel('  ', PLAIN, RICH)).toEqual({ content: '', lost: false });
  });

  it('refuses levels no question type family converts between', () => {
    expect(() => changeLevel('<p>a</p>', RICH, INLINE)).toThrow(/No conversion/);
  });
});
