// Contains utilities for handling Markdown content bidirectional conversion in TipTap editor.
// eslint-disable-next-line import/namespace
import { marked } from 'marked';
import { storageUrl } from '../../../../vuex/file/utils';

// --- Image Translation ---
export const IMAGE_PLACEHOLDER = '${☣ CONTENTSTORAGE}';
export const IMAGE_REGEX =
  /!\[([^\]]*)\]\(([^/]+\/[^\s=)]+)(?:\s*=\s*([0-9.]+)x([0-9.]+))?(?:\s+align=(\w+))?\)/g;

export const imageMdToParams = markdown => {
  // Reset regex state before executing to ensure it works on all matches
  IMAGE_REGEX.lastIndex = 0;
  const match = IMAGE_REGEX.exec(markdown);
  if (!match) return null;

  const [, alt, fullPath, width, height, align] = match;

  // Extract just the filename from the full path
  const checksumWithExt = fullPath.split('/').pop();

  // Now, split the filename into its parts
  const parts = checksumWithExt.split('.');
  const extension = parts.pop();
  const checksum = parts.join('.');

  // Return the data with the correct property names that the rest of the system expects.
  return { checksum, extension, alt: alt || '', width, height, align };
};

export const paramsToImageMd = ({ src, alt, width, height, permanentSrc, textAlign }) => {
  const sourceToSave = permanentSrc || src;

  const fileName = sourceToSave.split('/').pop();
  const alignSuffix = textAlign && textAlign !== 'left' ? ` align=${textAlign.trim()}` : '';
  if (Number.isFinite(+width) && Number.isFinite(+height)) {
    return `![${alt || ''}](${IMAGE_PLACEHOLDER}/${fileName} =${width}x${height}${alignSuffix})`;
  }
  return `![${alt || ''}](${IMAGE_PLACEHOLDER}/${fileName}${alignSuffix})`;
};

// --- Underline Translation ---
// Perseus simple-markdown treats __text__ as <u>; marked treats it as <strong>.
// Rewrite before marked runs so the round-trip preserves underline.
export const UNDERLINE_REGEX = /__([\s\S]+?)__(?!_)/g;

// --- Math/Formula Translation ---
export const MATH_REGEX = /\$\$([^$]+)\$\$/g;

export const mathMdToParams = markdown => {
  MATH_REGEX.lastIndex = 0;
  const match = MATH_REGEX.exec(markdown);
  if (!match) return null;
  return { latex: match[1].trim() };
};

export const paramsToMathMd = ({ latex }) => {
  return `$$${latex || ''}$$`;
};

/**
 * Pre-processes a raw Markdown string to convert custom syntax into HTML tags
 * that Tiptap's extensions can understand. This is our custom "loader".
 * @param {string} markdown - The raw markdown string.
 * @returns {string} - The processed string with HTML tags.
 */
export function preprocessMarkdown(markdown) {
  if (!markdown) return '';

  let processedMarkdown = markdown;

  // Then, handle our standard content-storage images.
  processedMarkdown = processedMarkdown.replace(IMAGE_REGEX, match => {
    const params = imageMdToParams(match);
    if (!params) return match;

    // 1. Convert the checksum into a real, displayable URL.
    const displayUrl = storageUrl(params.checksum, params.extension);

    // 2. The permanentSrc is just the checksum + extension.
    const permanentSrc = `${params.checksum}.${params.extension}`;

    // 3. Create attributes string for width, height, and alignment only if they exist
    const widthAttr = params.width ? ` width="${params.width}"` : '';
    const heightAttr = params.height ? ` height="${params.height}"` : '';
    const alignAttr = params.align ? ` style="text-align: ${params.align}"` : '';

    // 4. Create an <img> tag with the REAL display URL in `src`.
    return `<img src="${displayUrl}" permanentSrc="${permanentSrc}" alt="${params.alt}"${widthAttr}${heightAttr}${alignAttr} />`;
  });

  processedMarkdown = processedMarkdown.replace(MATH_REGEX, match => {
    const params = mathMdToParams(match);
    if (!params) return match;
    return `<span data-latex="${params.latex}"></span>`;
  });

  processedMarkdown = processedMarkdown.replace(UNDERLINE_REGEX, '<u>$1</u>');

  return marked(processedMarkdown);
}
