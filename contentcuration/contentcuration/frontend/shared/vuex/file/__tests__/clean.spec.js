import JSZip from 'jszip';
import { cleanFile } from '../clean';

describe('cleanFile', () => {
  let mockZip;
  let originalCreateElement;

  beforeEach(() => {
    mockZip = new JSZip();
    // Store original createElement
    originalCreateElement = global.document.createElement;
  });

  afterEach(() => {
    // Restore original methods
    global.document.createElement = originalCreateElement;
    jest.restoreAllMocks();
  });

  // Helper function to create a zip file with given contents
  async function createTestZip(files, options = {}) {
    for (const [path, content] of Object.entries(files)) {
      mockZip.file(path, content);
    }
    const zipContent = await mockZip.generateAsync({ type: 'blob' });
    return new File([zipContent], options.filename || 'test.zip', {
      type: 'application/zip',
      lastModified: options.lastModified || Date.now(),
    });
  }

  describe('HTML5 zip cleaning', () => {
    it('should remove unnecessary nesting from zip files', async () => {
      const originalFiles = {
        'dist/index.html': '<html></html>',
        'dist/css/style.css': 'body {}',
        'dist/js/main.js': "console.log('hello')",
      };

      const file = await createTestZip(originalFiles, { filename: 'test.zip' });
      const cleanedFile = await cleanFile(file);

      // Verify cleaned content
      const cleanedZip = await JSZip.loadAsync(cleanedFile);
      const cleanedPaths = Object.keys(cleanedZip.files);

      expect(cleanedPaths).toContain('index.html');
      expect(cleanedPaths).toContain('css/style.css');
      expect(cleanedPaths).toContain('js/main.js');
      expect(cleanedPaths).not.toContain('dist/index.html');
    });

    it('should preserve file structure when no unnecessary nesting exists', async () => {
      const originalFiles = {
        'index.html': '<html></html>',
        'css/style.css': 'body {}',
        'js/main.js': "console.log('hello')",
      };

      const file = await createTestZip(originalFiles);
      const cleanedFile = await cleanFile(file);

      // Verify cleaned content
      const cleanedZip = await JSZip.loadAsync(cleanedFile);
      const cleanedPaths = Object.keys(cleanedZip.files);

      expect(cleanedPaths).toHaveLength(Object.keys(originalFiles).length);
      expect(cleanedPaths).toContain('index.html');
      expect(cleanedPaths).toContain('css/style.css');
      expect(cleanedPaths).toContain('js/main.js');
    });

    it('should handle deeply nested structures', async () => {
      const originalFiles = {
        'project/src/dist/build/index.html': '<html></html>',
        'project/src/dist/build/assets/style.css': 'body {}',
      };

      const file = await createTestZip(originalFiles);
      const cleanedFile = await cleanFile(file);

      const cleanedZip = await JSZip.loadAsync(cleanedFile);
      const cleanedPaths = Object.keys(cleanedZip.files);

      expect(cleanedPaths).toContain('index.html');
      expect(cleanedPaths).toContain('assets/style.css');
    });
  });

  describe('Error handling', () => {
    it('should throw error for corrupt zip files', async () => {
      const corruptFile = new File(['not a zip file'], 'test.zip', { type: 'application/zip' });
      await expect(async () => await cleanFile(corruptFile)).rejects.toThrow();
    });

    it('should handle missing files in zip gracefully', async () => {
      const emptyZip = await mockZip.generateAsync({ type: 'blob' });
      const file = new File([emptyZip], 'test.zip', { type: 'application/zip' });

      const cleanedFile = await cleanFile(file);
      const cleanedZip = await JSZip.loadAsync(cleanedFile);

      expect(Object.keys(cleanedZip.files)).toHaveLength(0);
    });
  });

  describe('Non-HTML5 files', () => {
    it('should pass through non-zip files unchanged', async () => {
      const imageFile = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      const result = await cleanFile(imageFile);

      expect(result).toBe(imageFile);
    });

    it('should pass through unsupported formats unchanged', async () => {
      const unknownFile = new File(['unknown data'], 'test.xyz', {
        type: 'application/octet-stream',
      });
      const result = await cleanFile(unknownFile);

      expect(result).toBe(unknownFile);
    });
  });
});
