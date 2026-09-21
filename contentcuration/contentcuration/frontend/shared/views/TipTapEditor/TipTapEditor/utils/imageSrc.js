/**
 * Translates image sources between the two forms they take in HTML content.
 *
 * Stored content references an image by bare `<checksum>.<ext>` filename, which is
 * what publishing rewrites into a package's images/ directory (see the backend's
 * utils/assessment/qti/media.py) and what the QTI Img model accepts — it rejects
 * absolute paths outright. The browser, though, needs a URL it can load, so the
 * filename is resolved to its storage URL on the way into the editor and reduced
 * back to the filename on the way out.
 */
import { storageUrl } from 'shared/vuex/file/utils';

// Kept identical to QTI_CHECKSUM_FILEaNAME_REGEX in media.py, which decides on the
// backend which references publishing is able to resolve.
const CHECKSUM_FILENAME = /^([a-f0-9]{32})\.([0-9a-z]+)$/;

const IMG_TAG = /<img\b[^>]*>/gi;
const SRC_ATTRIBUTE = /\bsrc\s*=\s*(["'])(.*?)\1/i;

/**
 * Rewrite the src of every <img> in an HTML string.
 *
 * A targeted substitution rather than a parse-and-serialize round trip, so
 * everything else about the markup — attribute order, self-closing style,
 * whitespace — survives untouched.
 *
 * @param {string} html
 * @param {function(string): string} mapSrc
 * @returns {string}
 */
function mapImageSrcs(html, mapSrc) {
  if (!html) {
    return html;
  }
  return html.replace(IMG_TAG, tag =>
    tag.replace(SRC_ATTRIBUTE, (attribute, quote, src) => {
      const mapped = mapSrc(src);
      return mapped === src ? attribute : `src=${quote}${mapped}${quote}`;
    }),
  );
}

/**
 * Turn stored `<checksum>.<ext>` sources into loadable storage URLs.
 *
 * @param {string} html
 * @returns {string}
 */
export function resolveImageSrcs(html) {
  return mapImageSrcs(html, src => {
    const match = CHECKSUM_FILENAME.exec(src);
    return match ? storageUrl(match[1], match[2]) : src;
  });
}

/**
 * Reduce storage URLs back to the `<checksum>.<ext>` filename that gets stored.
 *
 * Sources that are not a checksum filename — a data URI, a remote image — are left
 * as they are.
 *
 * @param {string} html
 * @returns {string}
 */
export function toStoredImageSrcs(html) {
  return mapImageSrcs(html, src => {
    const filename = src.split('/').pop();
    return CHECKSUM_FILENAME.test(filename) ? filename : src;
  });
}
