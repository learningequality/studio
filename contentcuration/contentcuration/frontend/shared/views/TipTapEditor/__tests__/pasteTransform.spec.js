import { transformPastedHTML } from '../TipTapEditor/utils/pasteTransform';

describe('transformPastedHTML', () => {
  describe('empty inputs', () => {
    it('returns empty string for empty input', () => {
      expect(transformPastedHTML('')).toBe('');
    });

    it('returns empty string for null', () => {
      expect(transformPastedHTML(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(transformPastedHTML(undefined)).toBe('');
    });
  });

  describe('image stripping', () => {
    it('strips a single remote img', () => {
      const input = '<p>before <img src="https://example.com/x.png"> after</p>';
      expect(transformPastedHTML(input)).toBe('<p>before  after</p>');
    });

    it('strips a data: URI img', () => {
      const input = '<p><img src="data:image/png;base64,iVBORw0KGgo="></p>';
      expect(transformPastedHTML(input)).toBe('<p></p>');
    });

    it('strips img with no src', () => {
      const input = '<p><img></p>';
      expect(transformPastedHTML(input)).toBe('<p></p>');
    });

    it.each([
      ['http', '<img src="http://x.test/a.png">'],
      ['blob', '<img src="blob:https://x.test/abc">'],
      ['file', '<img src="file:///tmp/a.png">'],
      ['relative', '<img src="../a.png">'],
    ])('strips img with %s scheme', (_scheme, imgTag) => {
      expect(transformPastedHTML(`<p>${imgTag}</p>`)).toBe('<p></p>');
    });

    it('strips multiple imgs in different parents', () => {
      const input = [
        '<p>top <img src="a"></p>',
        '<img src="b">',
        '<ul><li><img src="c"> item</li></ul>',
      ].join('');
      const output = transformPastedHTML(input);
      expect(output).not.toContain('<img');
      expect(output).toContain('<p>top </p>');
      expect(output).toContain('<ul><li> item</li></ul>');
    });

    it('preserves surrounding marks when stripping mixed imgs', () => {
      const input =
        '<p><strong>bold</strong> <img src="a"> <em>italic</em> <a href="https://x">link</a></p>';
      const output = transformPastedHTML(input);
      expect(output).not.toContain('<img');
      expect(output).toContain('<strong>bold</strong>');
      expect(output).toContain('<em>italic</em>');
      expect(output).toContain('<a href="https://x">link</a>');
    });
  });

  describe('Word/Office cleanup', () => {
    it('removes MSO conditional comments', () => {
      const input = '<p>before <!--[if gte mso 9]><xml>junk</xml><![endif]--> after</p>';
      expect(transformPastedHTML(input)).toBe('<p>before  after</p>');
    });

    it('removes Office-namespaced tags (w:, m:, o:, v:)', () => {
      const input =
        '<p>before<w:hint val="x"></w:hint><o:p></o:p><m:r></m:r><v:rect></v:rect>after</p>';
      const output = transformPastedHTML(input);
      expect(output).not.toMatch(/<\/?[wmov]:/);
      expect(output).toContain('before');
      expect(output).toContain('after');
    });

    it('strips mso-* style declarations while keeping other styles', () => {
      const input =
        '<p style="mso-list:l0 level1; color: red; mso-bidi-font-size: 11pt; font-size: 12pt">x</p>';
      const output = transformPastedHTML(input);
      expect(output).not.toMatch(/mso-/);
      expect(output).toContain('color: red');
      expect(output).toContain('font-size: 12pt');
    });

    it('removes the style attribute entirely when all declarations were mso-*', () => {
      const input = '<p style="mso-list:l0 level1;mso-bidi-font-size: 11pt">x</p>';
      expect(transformPastedHTML(input)).toBe('<p>x</p>');
    });

    it('strips Mso* classes (case-insensitive) while keeping other classes', () => {
      const input = '<p class="MsoNormal kept-class MSOPlain">x</p>';
      const output = transformPastedHTML(input);
      expect(output).toContain('class="kept-class"');
      expect(output).not.toMatch(/Mso/i);
    });

    it('removes the class attribute entirely when all classes were Mso*', () => {
      const input = '<p class="MsoNormal MsoListParagraph">x</p>';
      expect(transformPastedHTML(input)).toBe('<p>x</p>');
    });

    it('hoists nested lists out of strike/s/del wrappers', () => {
      const input = '<s><ul><li>a</li></ul></s>';
      const output = transformPastedHTML(input);
      expect(output).toContain('<ul><li>a</li></ul>');
      expect(output.indexOf('</s>')).toBeLessThan(output.indexOf('<ul>'));
    });

    it('re-parents nested lists inside <li> to the end of the <li>', () => {
      const input = '<ul><li>text<ul><li>nested</li></ul>more text</li></ul>';
      const output = transformPastedHTML(input);
      expect(output).toMatch(/<li>textmore text<ul><li>nested<\/li><\/ul><\/li>/);
    });
  });

  describe('idempotency', () => {
    it.each([
      ['<p>plain text</p>'],
      ['<p>before <img src="x"> after</p>'],
      ['<p style="mso-bidi-font-size:11pt;color:red">x</p>'],
      ['<p class="MsoNormal kept">x</p>'],
      ['<s><ul><li>a</li></ul></s>'],
      ['<ul><li>text<ul><li>n</li></ul>more</li></ul>'],
      ['<!--[if gte mso 9]>x<![endif]--><p>y</p>'],
    ])('is idempotent: f(f(x)) === f(x) for %s', input => {
      const once = transformPastedHTML(input);
      const twice = transformPastedHTML(once);
      expect(twice).toBe(once);
    });
  });
});
