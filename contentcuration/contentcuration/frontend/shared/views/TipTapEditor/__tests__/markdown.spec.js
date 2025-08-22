// eslint-disable-next-line import/namespace
import { marked } from 'marked';
import { preprocessMarkdown } from '../TipTapEditor/utils/markdown';
import { storageUrl } from '../../../vuex/file/utils';

// Mock the dependencies at the top level
jest.mock('marked', () => ({
  marked: jest.fn(str => str),
}));
jest.mock('../../../vuex/file/utils', () => ({
  storageUrl: jest.fn((checksum, ext) => `/content/storage/${checksum}.${ext}`),
}));

describe('preprocessMarkdown', () => {
  beforeEach(() => {
    marked.mockClear();
    storageUrl.mockClear();
  });

  // 1: Legacy Checksum Images
  // Old images did not add dimensions unless a resize was used.
  describe('Legacy Image Handling', () => {
    it('should convert a legacy image with dimensions into a full <img> tag', () => {
      const legacyMd = '![some alt text](${CONTENTSTORAGE}/checksum.png =100x200)';
      const expectedHtml =
        '<img src="/content/storage/checksum.png" permanentSrc="checksum.png" alt="some alt text" width="100" height="200" />';
      expect(preprocessMarkdown(legacyMd)).toBe(expectedHtml);
    });

    it('should detect & convert a legacy image WITHOUT dimensions', () => {
      const legacyMd = '![No Dims](${☣ CONTENTSTORAGE}/file.jpg)';
      const expectedHtml =
        '<img src="/content/storage/file.jpg" permanentSrc="file.jpg" alt="No Dims" />';
      expect(preprocessMarkdown(legacyMd)).toBe(expectedHtml);
    });

    it('should process multiple legacy images correctly', () => {
      const mixedMd = [
        '![first](${CONTENTSTORAGE}/image1.jpg =100x100)',
        'Some text',
        '![second](${CONTENTSTORAGE}/image2.png)',
      ].join('\n');

      const expectedHtml = [
        '<img src="/content/storage/image1.jpg" permanentSrc="image1.jpg" alt="first" width="100" height="100" />',
        'Some text',
        '<img src="/content/storage/image2.png" permanentSrc="image2.png" alt="second" />',
      ].join('\n');

      const result = preprocessMarkdown(mixedMd);

      expect(result).toBe(expectedHtml);
      expect(storageUrl).toHaveBeenCalledWith('image1', 'jpg');
      expect(storageUrl).toHaveBeenCalledWith('image2', 'png');
    });
  });

  // 2: Data URL / Blob URL Images
  describe('Data URL Image Handling', () => {
    it('should convert a data URL image with dimensions into an <img> tag', () => {
      const dataUrlMd = '![Data](data:image/png;base64,iVBORw0KGgo= =300x400)';
      const expectedHtml =
        '<img src="data:image/png;base64,iVBORw0KGgo=" alt="Data" width="300" height="400" />';
      expect(preprocessMarkdown(dataUrlMd)).toBe(expectedHtml);
    });
  });

  // 3: Math Formulas
  describe('Math Formula Handling', () => {
    it('should convert a simple math formula into a <span> tag', () => {
      const mathMd = 'Some text $$x^2$$ and more text.';
      const expectedHtml = 'Some text <span data-latex="x^2"></span> and more text.';
      expect(preprocessMarkdown(mathMd)).toBe(expectedHtml);
    });

    it('should handle math formulas with spaces', () => {
      const mathMd = 'Formula: $$ x + y = z $$';
      const expectedHtml = 'Formula: <span data-latex="x + y = z"></span>';
      expect(preprocessMarkdown(mathMd)).toBe(expectedHtml);
    });
  });

  // 4: Standard Markdown Passthrough
  describe('Standard Markdown Passthrough', () => {
    it('should pass non-custom syntax through to the marked library', () => {
      const standardMd = 'Here is **bold** and a [link](url).';
      preprocessMarkdown(standardMd);
      // We test the *interaction*, not the result (the library).
      expect(marked).toHaveBeenCalled();
      expect(marked).toHaveBeenCalledWith(standardMd);
    });
  });

  // 5: Mixed Content
  describe('Mixed Content Handling', () => {
    it('should correctly process a string with legacy images, data URLs, math, and standard markdown', () => {
      const mixedMd =
        'Legacy: ![](${CONTENTSTORAGE}/file.png =10x10)\nData: ![alt](data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=)\nFormula: $$E=mc^2$$';
      const expectedHtml =
        'Legacy: <img src="/content/storage/file.png" permanentSrc="file.png" alt="" width="10" height="10" />\nData: <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="alt" />\nFormula: <span data-latex="E=mc^2"></span>';

      const result = preprocessMarkdown(mixedMd);
      expect(result).toBe(expectedHtml);
    });
  });

  // 6: Edge Cases
  describe('Edge Case Handling', () => {
    it('should return an empty string for null, undefined, or empty string input', () => {
      expect(preprocessMarkdown(null)).toBe('');
      expect(preprocessMarkdown(undefined)).toBe('');
      expect(preprocessMarkdown('')).toBe('');
    });

    it('should handle very long input without crashing', () => {
      const longMd = 'Text '.repeat(10000) + '$$x^2$$';
      expect(() => preprocessMarkdown(longMd)).not.toThrow();

      const result = preprocessMarkdown(longMd);
      expect(result).toContain('<span data-latex="x^2"></span>');
    });
  });
});
