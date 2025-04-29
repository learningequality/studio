import { createHash } from 'crypto';
import JSZip from 'jszip';
import { createPredictableZip, findFirstHtml, findCommonRoot } from '../zipFile';

// Test data and expected MD5s
// All MD5s are generated using ricecooker's test_zip.py
// they provide a source of truth that we are generating the same zip files
// as the python code, and should not be changed.
const TEST_CASES = {
  nested_text: {
    files: { 'folder/nested.txt': 'Nested content', 'test.txt': 'Hello World' },
    expectedMD5: '220f0d36a5150d3912a0eebee2738d80',
  },
  reversed: {
    files: {
      'b.txt': 'content b',
      'a.txt': 'content a',
    },
    expectedMD5: '5f3c72e2f32c5b7919cd6c31e5f169cd',
  },
  binaryFiles: {
    files: {
      // Equivalent of Python:
      // b"PNG\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"
      'image.png': new Uint8Array([
        0x50, 0x4e, 0x47, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]),
      'data.bin': new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      'text.txt': 'Mixed content',
    },
    expectedMD5: '18ba9ca5ba2ed25ada40111fcc055a82',
  },
  nested_binary: {
    files: {
      'folder/image.png': new Uint8Array([
        0x50, 0x4e, 0x47, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]),
      'test.txt': 'Hello World',
    },
    expectedMD5: '0fdfc3bd5b661ae3cde677d542426386',
  },
  simple_binary: {
    files: {
      'test.bin': new Uint8Array([0x00, 0x01, 0x02, 0x03]),
    },
    expectedMD5: '461a08dc38d2b7dae48c2bc2e641b958',
  },
};

function getMD5(data) {
  return createHash('md5').update(Buffer.from(data)).digest('hex');
}

describe('createPredictableZip', () => {
  for (const [name, testCase] of Object.entries(TEST_CASES)) {
    it(`creates expected zip for ${name} case`, async () => {
      const zipData = await createPredictableZip(testCase.files, testCase.options);
      expect(getMD5(zipData)).toBe(testCase.expectedMD5);
    });
  }

  it('creates consistent hashes regardless of input order', async () => {
    const reversed = { ...TEST_CASES.reversed.files };
    const zipData1 = await createPredictableZip(TEST_CASES.reversed.files);
    const zipData2 = await createPredictableZip(reversed);
    expect(getMD5(zipData1)).toBe(getMD5(zipData2));
  });
});

describe('findFirstHtml function', () => {
  let mockZip;

  beforeEach(() => {
    mockZip = new JSZip();
  });

  async function createTestZip(files) {
    for (const [path, content] of Object.entries(files)) {
      mockZip.file(path, content);
    }
    const zipContent = await mockZip.generateAsync({ type: 'blob' });
    return new File([zipContent], 'test.zip', { type: 'application/zip' });
  }

  it('should prioritize root level index.html when multiple exist', async () => {
    const file = await createTestZip({
      'dist/index.html': '<html></html>',
      'dist/subfolder/index.html': '<html></html>',
      'dist/assets/style.css': 'body {}',
    });

    const entryPoint = await findFirstHtml(file);
    expect(entryPoint).toBe('dist/index.html');
  });

  it('should find nested index.html when no root index exists', async () => {
    const file = await createTestZip({
      'dist/subfolder/index.html': '<html></html>',
      'dist/about.html': '<html></html>',
    });

    const entryPoint = await findFirstHtml(file);
    expect(entryPoint).toBe('dist/subfolder/index.html');
  });

  it('should handle deeply nested structures correctly', async () => {
    const file = await createTestZip({
      'project/dist/index.html': '<html></html>',
      'project/dist/subfolder/index.html': '<html></html>',
    });

    const entryPoint = await findFirstHtml(file);
    expect(entryPoint).toBe('project/dist/index.html');
  });

  it('should fall back to shallowest HTML file when no index.html exists', async () => {
    const file = await createTestZip({
      'dist/main.html': '<html></html>',
      'dist/subfolder/about.html': '<html></html>',
    });

    const entryPoint = await findFirstHtml(file);
    expect(entryPoint).toBe('dist/main.html');
  });

  it('should error for corrupt zip files', async () => {
    const file = new File(['not a zip file'], 'test.zip', { type: 'application/zip' });

    await expect(async () => await findFirstHtml(file)).rejects.toThrow();
  });
});

describe('findCommonRoot', () => {
  // Helper to create a JSZip file structure and return its files object
  async function createZipStructure(paths) {
    const zip = new JSZip();

    // First create all directories to ensure proper structure
    paths.forEach(path => {
      if (path.endsWith('/')) {
        zip.folder(path.slice(0, -1)); // Remove trailing slash when creating folder
      }
    });

    // Then add files
    paths.forEach(path => {
      if (!path.endsWith('/')) {
        zip.file(path, 'content'); // Add some content for files
      }
    });

    await zip.generateAsync({ type: 'blob' }); // Generate to ensure proper structure
    return zip.files;
  }

  it('should return empty string for empty files object', async () => {
    const files = await createZipStructure([]);
    expect(findCommonRoot(files)).toBe('');
  });

  it('should return empty string when no common root exists', async () => {
    const files = await createZipStructure(['file1.txt', 'file2.txt', 'different/path/file3.txt']);
    expect(findCommonRoot(files)).toBe('');
  });

  it('should find single level common root', async () => {
    const files = await createZipStructure([
      'dist/',
      'dist/file1.txt',
      'dist/file2.txt',
      'dist/subfolder/',
      'dist/subfolder/file3.txt',
    ]);
    expect(findCommonRoot(files)).toBe('dist');
  });

  it('should ignore directory entries when finding common root', async () => {
    const files = await createZipStructure([
      'dist/',
      'dist/css/',
      'dist/js/',
      'dist/index.html',
      'dist/css/style.css',
    ]);
    expect(findCommonRoot(files)).toBe('dist');
  });

  it('should find deep common root ignoring directories', async () => {
    const files = await createZipStructure([
      'path/to/my/files/',
      'path/to/my/files/subfolder/',
      'path/to/my/files/file1.txt',
      'path/to/my/files/file2.txt',
      'path/to/my/files/subfolder/file3.txt',
    ]);
    expect(findCommonRoot(files)).toBe('path/to/my/files');
  });

  it('should not treat partial directory names as common', async () => {
    const files = await createZipStructure([
      'mydir/',
      'mydir/file1.txt',
      'mydir2/',
      'mydir2/file2.txt',
    ]);
    expect(findCommonRoot(files)).toBe('');
  });

  it('should handle single file ignoring its directory', async () => {
    const files = await createZipStructure(['path/to/files/', 'path/to/files/single.txt']);
    expect(findCommonRoot(files)).toBe('path/to/files');
  });

  it('should not return common root if any file is at root level', async () => {
    const files = await createZipStructure([
      'rootfile.txt',
      'folder/',
      'folder/file1.txt',
      'folder/file2.txt',
    ]);
    expect(findCommonRoot(files)).toBe('');
  });

  it('should handle complex nested structures with directories', async () => {
    const files = await createZipStructure([
      'project/',
      'project/src/',
      'project/src/dist/',
      'project/src/dist/build/',
      'project/src/dist/build/index.html',
      'project/src/dist/build/assets/',
      'project/src/dist/build/assets/style.css',
      'project/src/dist/build/assets/js/',
      'project/src/dist/build/assets/js/main.js',
    ]);
    expect(findCommonRoot(files)).toBe('project/src/dist/build');
  });

  it('should handle paths with dots ignoring directories', async () => {
    const files = await createZipStructure([
      'my.folder/',
      'my.folder/sub.dir/',
      'my.folder/file1.txt',
      'my.folder/file2.txt',
      'my.folder/sub.dir/file3.txt',
    ]);
    expect(findCommonRoot(files)).toBe('my.folder');
  });

  it('should handle mixed case paths correctly', async () => {
    const files = await createZipStructure(['Dist/', 'dist/file1.txt', 'DIST/file2.txt']);
    expect(findCommonRoot(files)).toBe(''); // Case-sensitive comparison
  });

  it('should handle empty directories correctly', async () => {
    const files = await createZipStructure(['dist/', 'dist/empty/', 'dist/file1.txt']);
    expect(findCommonRoot(files)).toBe('dist');
  });

  it('should handle deeply nested single file correctly', async () => {
    const files = await createZipStructure(['very/deep/nested/path/to/file.txt']);
    expect(findCommonRoot(files)).toBe('very/deep/nested/path/to');
  });

  it('should handle multiple files at different depths correctly', async () => {
    const files = await createZipStructure([
      'root/deep/path/file1.txt',
      'root/deep/file2.txt',
      'root/deep/path/to/file3.txt',
    ]);
    expect(findCommonRoot(files)).toBe('root/deep');
  });
  it('should handle paths with unicode characters', async () => {
    const files = await createZipStructure([
      'ユーザー/',
      'ユーザー/フォルダ/',
      'ユーザー/file1.txt',
      'ユーザー/フォルダ/file2.txt',
    ]);
    expect(findCommonRoot(files)).toBe('ユーザー');
  });

  it('should handle paths with spaces and special characters', async () => {
    const files = await createZipStructure([
      'My Documents/',
      'My Documents/Some & Files/',
      'My Documents/Some & Files/file1.txt',
      'My Documents/Some & Files/file (2).txt',
    ]);
    expect(findCommonRoot(files)).toBe('My Documents/Some & Files');
  });

  it('should handle paths where one is a prefix of another directory name', async () => {
    const files = await createZipStructure([
      'base/',
      'base-extended/',
      'base/file1.txt',
      'base-extended/file2.txt',
    ]);
    expect(findCommonRoot(files)).toBe('');
  });

  it('should handle files with same names at different levels', async () => {
    const files = await createZipStructure([
      'folder1/index.html',
      'folder1/subfolder/index.html',
      'folder1/subfolder/subsub/index.html',
    ]);
    expect(findCommonRoot(files)).toBe('folder1');
  });

  it('should handle path segments that are numerically sequential', async () => {
    const files = await createZipStructure([
      'path/1/file.txt',
      'path/2/file.txt',
      'path/10/file.txt',
    ]);
    expect(findCommonRoot(files)).toBe('path');
  });
});
