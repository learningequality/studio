import { randomFillSync } from 'crypto';
import JSZip from 'jszip';
import { cleanFile } from '../clean';

function readBytes(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

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
    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content, { date: options.date });
    }
    const zipContent = await zip.generateAsync({
      type: 'blob',
      compression: options.compression || 'STORE',
    });
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

    it('should preserve file contents', async () => {
      const binary = new Uint8Array([0x00, 0xff, 0x10, 0x80, 0x7f]);
      const file = await createTestZip({
        'dist/index.html': '<html>ünïcödé</html>',
        'dist/model/weights.bin': binary,
      });
      const cleanedZip = await JSZip.loadAsync(await cleanFile(file));

      expect(await cleanedZip.file('index.html').async('string')).toBe('<html>ünïcödé</html>');
      expect(await cleanedZip.file('model/weights.bin').async('uint8array')).toEqual(binary);
    });

    it('should produce identical bytes for the same files zipped differently', async () => {
      const files = {
        'index.html': '<html></html>',
        'js/main.js': "console.log('hello')",
      };
      const nestedReversed = {
        'build/js/main.js': files['js/main.js'],
        'build/index.html': files['index.html'],
      };
      const first = await cleanFile(await createTestZip(files, { date: new Date(2020, 1, 1) }));
      const second = await cleanFile(
        await createTestZip(nestedReversed, {
          compression: 'DEFLATE',
          date: new Date(2024, 5, 5),
        }),
      );

      expect(await readBytes(second)).toEqual(await readBytes(first));
    });

    it('should keep the original file name, type and modification time', async () => {
      const file = await createTestZip(
        { 'dist/index.html': '<html></html>' },
        { filename: 'course.zip', lastModified: 1234567890 },
      );
      const cleanedFile = await cleanFile(file);

      expect(cleanedFile.name).toBe('course.zip');
      expect(cleanedFile.type).toBe('application/zip');
      expect(cleanedFile.lastModified).toBe(1234567890);
    });

    it('should clean zips of incompressible content larger than 100 MB', async () => {
      const size = 110 * 1024 * 1024;
      const file = await createTestZip({
        'index.html': '<html></html>',
        'model/weights.bin': randomFillSync(new Uint8Array(size)),
      });
      const cleanedFile = await cleanFile(file);

      expect(cleanedFile.size).toBeGreaterThan(size);
    }, 120000);
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
