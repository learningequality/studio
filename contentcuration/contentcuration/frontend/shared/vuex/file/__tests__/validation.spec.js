import JSZip from 'jszip';
import { IMAGE_PRESETS, VIDEO_PRESETS } from '../utils';
import {
  validateFile,
  VALID,
  INVALID_UNREADABLE_FILE,
  INVALID_UNSUPPORTED_FORMAT,
  INVALID_HTML5_ZIP,
} from '../validation';
import FormatPresets from 'shared/leUtils/FormatPresets';

describe('validateFile', () => {
  let mockObjectUrl;
  let originalCreateElement;

  beforeEach(() => {
    mockObjectUrl = 'blob:mock-url';

    // Mock URL methods
    global.URL.createObjectURL = jest.fn(() => mockObjectUrl);
    global.URL.revokeObjectURL = jest.fn();

    // Store original createElement
    originalCreateElement = global.document.createElement;

    // Mock createElement for media elements
    global.document.createElement = function(tagName) {
      if (['audio', 'video', 'img'].includes(tagName)) {
        return {
          set src(url) {
            // Small delay to simulate async loading
            setTimeout(() => {
              if (tagName === 'img') {
                this.onload?.();
              } else {
                this.onloadedmetadata?.();
              }
            }, 0);
          },
        };
      }
      return originalCreateElement.call(document, tagName);
    };
  });

  afterEach(() => {
    // Restore original methods
    global.document.createElement = originalCreateElement;
    jest.restoreAllMocks();
  });

  // Helper function to create a mock file
  const createMockFile = (name, type = '') => new File([], name, { type });

  // Helper to create failing media element
  const createFailingElement = () => ({
    set src(url) {
      setTimeout(() => this.onerror?.(new Error('Failed to load')), 0);
    },
  });

  describe('Format validation', () => {
    it('should reject unsupported file formats', async () => {
      const file = createMockFile('test.unknown');
      const result = await validateFile(file);
      expect(result).toBe(INVALID_UNSUPPORTED_FORMAT);
    });

    it('should accept supported non-media formats without validation', async () => {
      const file = createMockFile('test.pdf'); // document preset
      const result = await validateFile(file);
      expect(result).toBe(VALID);
    });
  });

  describe('Audio validation', () => {
    it('should validate MP3 files correctly', async () => {
      const file = createMockFile('test.mp3', 'audio/mpeg');
      const result = await validateFile(file);
      expect(result).toBe(VALID);
    });

    it('should handle audio load errors', async () => {
      global.document.createElement = function(tagName) {
        if (tagName === 'audio') {
          return createFailingElement('audio');
        }
        return originalCreateElement.call(document, tagName);
      };

      const file = createMockFile('test.mp3', 'audio/mpeg');
      const result = await validateFile(file);
      expect(result).toBe(INVALID_UNREADABLE_FILE);
    });
  });

  describe('Video validation', () => {
    const videoFormats = [];

    for (const preset of VIDEO_PRESETS) {
      const presetObject = FormatPresets.get(preset);
      for (const ext of presetObject.allowed_formats) {
        videoFormats.push({ preset, ext, type: `video/${ext}` });
      }
    }

    test.each(videoFormats)('should validate %j files correctly', async ({ ext, type }) => {
      const file = createMockFile(`test.${ext}`, type);
      const result = await validateFile(file);
      expect(result).toBe(VALID);
    });

    it('should handle video load errors', async () => {
      global.document.createElement = function(tagName) {
        if (tagName === 'video') {
          return createFailingElement('video');
        }
        return originalCreateElement.call(document, tagName);
      };

      const file = createMockFile('test.mp4', 'video/mp4');
      const result = await validateFile(file);
      expect(result).toBe(INVALID_UNREADABLE_FILE);
    });
  });

  describe('Image validation', () => {
    const imagePresets = [];

    for (const preset of IMAGE_PRESETS) {
      const presetObject = FormatPresets.get(preset);
      if (presetObject.display) {
        for (const ext of presetObject.allowed_formats) {
          imagePresets.push({ preset, ext, type: ext === 'jpg' ? 'image/jpeg' : `image/${ext}` });
        }
      }
    }

    test.each(imagePresets)('should validate %j files correctly', async ({ ext, type }) => {
      const file = createMockFile(`test.${ext}`, type);
      const result = await validateFile(file);
      expect(result).toBe(VALID);
    });

    it('should handle image load errors', async () => {
      global.document.createElement = function(tagName) {
        if (tagName === 'img') {
          return createFailingElement('img');
        }
        return originalCreateElement.call(document, tagName);
      };

      const file = createMockFile('test.png', 'image/png');
      const result = await validateFile(file);
      expect(result).toBe(INVALID_UNREADABLE_FILE);
    });
  });

  describe('HTML5 zip validation', () => {
    let mockZip;

    beforeEach(() => {
      mockZip = new JSZip();
    });

    it('should validate zip with root index.html', async () => {
      mockZip.file('index.html', '<html></html>');
      mockZip.file('assets/style.css', 'body {}');
      const zipContent = await mockZip.generateAsync({ type: 'blob' });
      const file = new File([zipContent], 'test.zip', { type: 'application/zip' });

      const result = await validateFile(file);
      expect(result).toBe(VALID);
    });

    it('should validate zip with nested index.html in common root', async () => {
      mockZip.file('dist/index.html', '<html></html>');
      mockZip.file('dist/assets/style.css', 'body {}');
      const zipContent = await mockZip.generateAsync({ type: 'blob' });
      const file = new File([zipContent], 'test.zip', { type: 'application/zip' });

      const result = await validateFile(file);
      expect(result).toBe(VALID);
    });

    it('should validate zip with alternative HTML file when no index.html exists', async () => {
      mockZip.file('main.html', '<html></html>');
      mockZip.file('assets/style.css', 'body {}');
      const zipContent = await mockZip.generateAsync({ type: 'blob' });
      const file = new File([zipContent], 'test.zip', { type: 'application/zip' });

      const result = await validateFile(file);
      expect(result).toBe(VALID);
    });

    it('should validate zip with deeply nested alternative HTML file', async () => {
      mockZip.file('project/dist/src/main.html', '<html></html>');
      mockZip.file('project/dist/assets/style.css', 'body {}');
      const zipContent = await mockZip.generateAsync({ type: 'blob' });
      const file = new File([zipContent], 'test.zip', { type: 'application/zip' });

      const result = await validateFile(file);
      expect(result).toBe(VALID);
    });

    it('should reject zip without any HTML files', async () => {
      mockZip.file('styles.css', 'body {}');
      mockZip.file('script.js', "console.log('test');");
      const zipContent = await mockZip.generateAsync({ type: 'blob' });
      const file = new File([zipContent], 'test.zip', { type: 'application/zip' });

      const result = await validateFile(file);
      expect(result).toBe(INVALID_HTML5_ZIP);
    });

    it('should reject corrupted zip files', async () => {
      const file = new File(['not a zip file'], 'test.zip', { type: 'application/zip' });
      const result = await validateFile(file);
      expect(result).toBe(INVALID_UNREADABLE_FILE);
    });
  });

  describe('Resource cleanup', () => {
    it('should clean up object URLs after successful validation', async () => {
      const file = createMockFile('test.mp3', 'audio/mpeg');
      await validateFile(file);

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockObjectUrl);
    });

    it('should clean up object URLs after failed validation', async () => {
      global.document.createElement = function(tagName) {
        if (tagName === 'audio') {
          return createFailingElement('audio');
        }
        return originalCreateElement.call(document, tagName);
      };

      const file = createMockFile('test.mp3', 'audio/mpeg');
      await validateFile(file);

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockObjectUrl);
    });
  });
});
