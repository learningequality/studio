// Contains utilities for handling Markdown content bidirectional conversion in TipTap editor.
// eslint-disable-next-line import/namespace
import { marked } from 'marked';
import { storageUrl } from '../../../../vuex/file/utils';

// --- Image Translation ---
export const IMAGE_PLACEHOLDER = '${☣ CONTENTSTORAGE}';
export const IMAGE_REGEX = /!\[([^\]]*)\]\(([^/]+\/[^\s=)]+)(?:\s*=\s*([0-9.]+)x([0-9.]+))?\)/g;
export const DATA_URL_IMAGE_REGEX =
  /!\[([^\]]*)\]\(((?:data:|blob:).+?)(?:\s*=\s*([0-9.]+)x([0-9.]+))?\)/g;

export const imageMdToParams = markdown => {
  // Reset regex state before executing to ensure it works on all matches
  IMAGE_REGEX.lastIndex = 0;
  const match = IMAGE_REGEX.exec(markdown);
  if (!match) return null;

  const [, alt, fullPath, width, height] = match;

  // Extract just the filename from the full path
  const checksumWithExt = fullPath.split('/').pop();

  // Now, split the filename into its parts
  const parts = checksumWithExt.split('.');
  const extension = parts.pop();
  const checksum = parts.join('.');

  // Return the data with the correct property names that the rest of the system expects.
  return { checksum, extension, alt: alt || '', width, height };
};

export const paramsToImageMd = ({ src, alt, width, height, permanentSrc }) => {
  const sourceToSave = permanentSrc || src;

  // As a safety net, if the source is still a data/blob URL, we should not
  // try to create a placeholder format. This should not happen with our new logic,
  // but it makes the function more robust.
  if (sourceToSave.startsWith('data:') || sourceToSave.startsWith('blob:')) {
    if (width && height) {
      return `![${alt || ''}](${sourceToSave} =${width}x${height})`;
    }
    return `![${alt || ''}](${sourceToSave})`;
  }

  const fileName = sourceToSave.split('/').pop();
  if (width && height) {
    return `![${alt || ''}](${IMAGE_PLACEHOLDER}/${fileName} =${width}x${height})`;
  }
  return `![${alt || ''}](${IMAGE_PLACEHOLDER}/${fileName})`;
};

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

  // First, handle data URLs and blob URLs for images.
  processedMarkdown = processedMarkdown.replace(
    DATA_URL_IMAGE_REGEX,
    (match, alt, src, width, height) => {
      const widthAttr = width ? ` width="${width}"` : '';
      const heightAttr = height ? ` height="${height}"` : '';
      return `<img src="${src}" alt="${alt || ''}"${widthAttr}${heightAttr} />`;
    },
  );

  // Then, handle our standard content-storage images.
  processedMarkdown = processedMarkdown.replace(IMAGE_REGEX, match => {
    const params = imageMdToParams(match);
    if (!params) return match;

    // 1. Convert the checksum into a real, displayable URL.
    const displayUrl = storageUrl(params.checksum, params.extension);

    // 2. The permanentSrc is just the checksum + extension.
    const permanentSrc = `${params.checksum}.${params.extension}`;

    // 3. Create attributes string for width and height only if they exist
    const widthAttr = params.width ? ` width="${params.width}"` : '';
    const heightAttr = params.height ? ` height="${params.height}"` : '';

    // 4. Create an <img> tag with the REAL display URL in `src`.
    return `<img src="${displayUrl}" permanentSrc="${permanentSrc}" alt="${params.alt}"${widthAttr}${heightAttr} />`;
  });

  processedMarkdown = processedMarkdown.replace(MATH_REGEX, match => {
    const params = mathMdToParams(match);
    if (!params) return match;
    return `<span data-latex="${params.latex}"></span>`;
  });

  // Use marked.js to parse the rest of the markdown
  return marked(processedMarkdown);
}
