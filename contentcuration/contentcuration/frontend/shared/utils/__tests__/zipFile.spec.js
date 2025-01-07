import { createHash } from 'crypto';
import { createPredictableZip } from '../zipFile';

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
        0x50,
        0x4e,
        0x47,
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ]),
      'data.bin': new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      'text.txt': 'Mixed content',
    },
    expectedMD5: '18ba9ca5ba2ed25ada40111fcc055a82',
  },
  nested_binary: {
    files: {
      'folder/image.png': new Uint8Array([
        0x50,
        0x4e,
        0x47,
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
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
  return createHash('md5')
    .update(Buffer.from(data))
    .digest('hex');
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
