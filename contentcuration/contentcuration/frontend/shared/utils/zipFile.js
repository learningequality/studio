import JSZip from 'jszip';
import { deflateRaw } from 'pako';
import crc32 from 'crc-32';

// Helper to write uint32 to a Uint8Array at specified offset
function writeUInt32LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
  array[offset + 2] = (value >> 16) & 0xff;
  array[offset + 3] = (value >> 24) & 0xff;
}

// Helper to write uint16 to a Uint8Array at specified offset
function writeUInt16LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
}

// Creates a central directory entry matching Python's zipfile implementation
// Format: "<4s4B4HL2L5H2L" from Python's structCentralDir
function createCentralDirectoryEntry(
  filename, // Name of file in the zip
  compressedSize, // Size of compressed data
  uncompressedSize, // Original file size
  headerOffset, // Offset of local header from start of zip
  crc32, // CRC32 of uncompressed data
) {
  // Convert filename to bytes
  const filenameBytes = new Uint8Array(filename.split('').map(c => c.charCodeAt(0)));
  const filenameLength = filenameBytes.length;

  // Fixed values matching Python's zipfile defaults
  const CREATE_VERSION = 20; // Python: DEFAULT_VERSION
  const CREATE_SYSTEM = 0; // Python: 0 = Windows/DOS
  const EXTRACT_VERSION = 20; // Python: DEFAULT_VERSION
  const FLAG_BITS = 0; // No special flags
  const COMPRESSION = 8; // DEFLATE compression
  const DISK_NUMBER = 0; // Always 0 for single file
  const INTERNAL_ATTRS = 0; // Unused
  const EXTERNAL_ATTRS = 0o600 << 16; // Unix rw------- permissions

  // Fixed time (07:28:00) and date (2015-10-21) matching Python implementation
  const TIME = 0x3b80; // (7 << 11) | (28 << 5) | (0 >> 1)
  const DATE = 0x4755; // ((2015-1980) << 9) | (10 << 5) | 21

  // Create the fixed-length header
  const entry = new Uint8Array(46); // 46 bytes fixed header

  // Write all fields at their fixed offsets
  writeUInt32LE(entry, 0x02014b50, 0); // Central directory header signature
  entry[4] = CREATE_VERSION; // Version made by
  entry[5] = CREATE_SYSTEM; // System made by
  entry[6] = EXTRACT_VERSION; // Version needed to extract
  entry[7] = 0; // Reserved byte

  writeUInt16LE(entry, FLAG_BITS, 8); // General purpose bit flag
  writeUInt16LE(entry, COMPRESSION, 10); // Compression method
  writeUInt16LE(entry, TIME, 12); // Last mod file time
  writeUInt16LE(entry, DATE, 14); // Last mod file date
  writeUInt32LE(entry, crc32, 16); // CRC-32
  writeUInt32LE(entry, compressedSize, 20); // Compressed size
  writeUInt32LE(entry, uncompressedSize, 24); // Uncompressed size
  writeUInt16LE(entry, filenameLength, 28); // Filename length
  writeUInt16LE(entry, 0, 30); // Extra field length
  writeUInt16LE(entry, 0, 32); // File comment length
  writeUInt16LE(entry, DISK_NUMBER, 34); // Disk number start
  writeUInt16LE(entry, INTERNAL_ATTRS, 36); // Internal file attributes
  writeUInt32LE(entry, EXTERNAL_ATTRS, 38); // External file attributes
  writeUInt32LE(entry, headerOffset, 42); // Relative offset of local header

  // Combine header with filename
  const result = new Uint8Array(entry.length + filenameBytes.length);
  result.set(entry);
  result.set(filenameBytes, entry.length);
  return result;
}

// Creates a local file header matching Python's zipfile implementation
// Format: "<4s2B4HL2L2H" from Python's structFileHeader
function createLocalFileHeader(
  filename, // Name of file in the zip
  compressedSize, // Size of compressed data
  uncompressedSize, // Original file size
  crc32, // CRC32 of uncompressed data
  extraFieldLength = 0, // Length of optional extra field
) {
  // Convert filename to bytes
  const filenameBytes = new Uint8Array(filename.split('').map(c => c.charCodeAt(0)));
  const filenameLength = filenameBytes.length;

  // Fixed values matching Python's zipfile defaults
  const EXTRACT_VERSION = 20; // Python: DEFAULT_VERSION
  const FLAGS = 0; // No special flags
  const COMPRESSION = 8; // DEFLATE compression

  // Fixed time (07:28:00) and date (2015-10-21) matching Python implementation
  const TIME = 0x3b80; // (7 << 11) | (28 << 5) | (0 >> 1)
  const DATE = 0x4755; // ((2015-1980) << 9) | (10 << 5) | 21

  // Create the fixed-length header (30 bytes)
  const header = new Uint8Array(30);

  // Write all fields at their fixed offsets
  writeUInt32LE(header, 0x04034b50, 0); // Local file header signature
  header[4] = EXTRACT_VERSION; // Version needed to extract
  header[5] = 0; // Reserved byte
  writeUInt16LE(header, FLAGS, 6); // General purpose bit flag
  writeUInt16LE(header, COMPRESSION, 8); // Compression method
  writeUInt16LE(header, TIME, 10); // Last mod file time
  writeUInt16LE(header, DATE, 12); // Last mod file date
  writeUInt32LE(header, crc32, 14); // CRC-32
  writeUInt32LE(header, compressedSize, 18); // Compressed size
  writeUInt32LE(header, uncompressedSize, 22); // Uncompressed size
  writeUInt16LE(header, filenameLength, 26); // Filename length
  writeUInt16LE(header, extraFieldLength, 28); // Extra field length

  // Combine header with filename
  const result = new Uint8Array(header.length + filenameLength + extraFieldLength);
  result.set(header);
  result.set(filenameBytes, header.length);
  // Note: Caller is responsible for appending any extra field data after the filename

  return result;
}

// Creates end of central directory record matching Python's implementation
// Format: "<4s4H2LH" from Python's structEndArchive
function createEndOfCentralDirectory(
  entryCount, // Number of entries in central directory
  centralDirSize, // Size of central directory in bytes
  centralDirOffset, // Offset of start of central directory from start of archive
) {
  // End of central directory is always 22 bytes
  const eocdr = new Uint8Array(22);

  // Fixed values
  const DISK_NUM = 0; // Current disk number (single file)
  const CD_DISK_NUM = 0; // Disk number of central directory
  const COMMENT_LENGTH = 0; // No comment

  // Write all fields at their fixed offsets
  writeUInt32LE(eocdr, 0x06054b50, 0); // End of central dir signature
  writeUInt16LE(eocdr, DISK_NUM, 4); // Number of this disk
  writeUInt16LE(eocdr, CD_DISK_NUM, 6); // Disk where central directory starts
  writeUInt16LE(eocdr, entryCount, 8); // Number of central directory entries on this disk
  writeUInt16LE(eocdr, entryCount, 10); // Total number of central directory entries
  writeUInt32LE(eocdr, centralDirSize, 12); // Size of central directory
  writeUInt32LE(eocdr, centralDirOffset, 16); // Offset of central directory
  writeUInt16LE(eocdr, COMMENT_LENGTH, 20); // Comment length

  return eocdr;
}

function calculateCrc32(data) {
  return crc32.buf(data) >>> 0; // Convert to unsigned 32-bit
}

/**
 * Creates a predictable ZIP file from the given files.
 *
 * @param {Object.<string, string|Uint8Array>} files - An object where the keys are file paths and
 * the values are file contents.
 * @returns {Promise<Buffer>} - A promise that resolves to a Buffer containing the ZIP file data.
 *
 * @example
 * const files = {
 *   'file1.txt': 'Hello, world!',
 *   'file2.bin': new Uint8Array([0x00, 0x01, 0x02, 0x03]),
 *   'folder/nested.txt': 'Nested content',
 * };
 * createPredictableZip(files).then(zipBuffer => {
 *   // Do something with the zipBuffer
 * });
 */
export async function createPredictableZip(files) {
  const sortedPaths = Object.keys(files).sort();
  const entries = [];
  let offset = 0;
  const centralDir = [];
  let centralDirSize = 0;

  for (const path of sortedPaths) {
    const content = files[path];
    // Handle binary data more carefully
    const rawData =
      typeof content === 'string'
        ? new Uint8Array([...content].map(c => c.charCodeAt(0)))
        : content instanceof Uint8Array
          ? content
          : new Uint8Array(content);

    // Use raw deflate without zlib headers
    const compressed = deflateRaw(rawData, {
      level: 6,
      windowBits: -15,
      memLevel: 8,
      strategy: 0,
    });

    const filenameCleaned = path.replace(/\\/g, '/');
    const checksum = calculateCrc32(rawData);

    const header = createLocalFileHeader(
      filenameCleaned,
      compressed.length,
      rawData.length,
      checksum,
    );

    const entry = {
      header,
      compressed: new Uint8Array(compressed),
      path: filenameCleaned,
      crc32: checksum,
      compressedSize: compressed.length,
      uncompressedSize: rawData.length,
      offset,
    };

    entries.push(entry);

    const dirEntry = createCentralDirectoryEntry(
      entry.path,
      entry.compressedSize,
      entry.uncompressedSize,
      entry.offset,
      entry.crc32,
    );
    centralDir.push(dirEntry);
    centralDirSize += dirEntry.length;

    offset += header.length + compressed.length;
  }

  const endOfCentralDir = createEndOfCentralDirectory(entries.length, centralDirSize, offset);

  return new Uint8Array([
    ...entries.map(e => [...e.header, ...e.compressed]).flat(),
    ...centralDir.map(dir => [...dir]).flat(),
    ...endOfCentralDir,
  ]);
}

/**
 * Finds the common root directory in a zip structure
 * @param {Object} files - JSZip files object
 * @returns {string} - Common root path or empty string if none
 */
export function findCommonRoot(files) {
  const paths = Object.entries(files)
    // Get only non-directory file paths
    .filter(([, file]) => !file.dir)
    // Extract directory paths from file paths
    .map(([path]) => path.split('/').slice(0, -1));

  if (paths.length === 0) {
    return '';
  }

  // If only one file, return its directory path
  if (paths.length === 1) {
    return paths[0].join('/');
  }

  const firstPath = paths[0];
  const commonParts = [];
  let index = 0;

  // Keep checking parts until we run out or find a mismatch
  while (index < firstPath.length) {
    const part = firstPath[index];

    // Check if this part matches in all other paths
    for (const path of paths.slice(1)) {
      if (index >= path.length || path[index] !== part) {
        return commonParts.join('/');
      }
    }

    commonParts.push(part);
    index++;
  }
  return commonParts.join('/');
}

/**
 * Finds the first HTML file in a zip file, prioritizing index.html
 * @param {File} file - The zip file to analyze
 * @returns {Promise<string|null>} - Path to the HTML file or null if none found
 */
export async function findFirstHtml(file) {
  const zip = new JSZip();

  const zipContent = await zip.loadAsync(file);
  const files = zipContent.files;
  const htmlFiles = Object.keys(files).filter(path => path.toLowerCase().endsWith('.html'));

  if (htmlFiles.length === 0) {
    return null;
  }

  // Find common root path
  const commonRoot = findCommonRoot(files);
  const rootPrefix = commonRoot ? commonRoot + '/' : '';

  // Remove common root from paths for comparison
  const normalizedPaths = htmlFiles.map(path => ({
    original: path,
    normalized: commonRoot ? path.slice(rootPrefix.length) : path,
  }));

  // First priority: index.html at root level after removing common path
  const rootIndex = normalizedPaths.find(p => p.normalized === 'index.html');
  if (rootIndex) {
    return rootIndex.original;
  }

  // Second priority: any index.html
  const indexFile = normalizedPaths.find(p => p.normalized.split('/').pop() === 'index.html');
  if (indexFile) {
    return indexFile.original;
  }

  // Last resort: first HTML file at the shallowest level
  return normalizedPaths.sort((a, b) => {
    const depthA = a.normalized.split('/').length;
    const depthB = b.normalized.split('/').length;
    if (depthA !== depthB) {
      return depthA - depthB;
    }
    return a.normalized.length - b.normalized.length;
  })[0].original;
}
