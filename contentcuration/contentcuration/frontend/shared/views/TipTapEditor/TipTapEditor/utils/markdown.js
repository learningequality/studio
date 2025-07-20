// Contains utilities for handling Markdown content bidirectional conversion in TipTap editor.
// eslint-disable-next-line import/namespace
import { marked } from 'marked';

// --- Image Translation ---
export const IMAGE_PLACEHOLDER = 'placeholder';
export const IMAGE_REGEX = /!\[([^\]]*)\]\(([^/]+\/[^\s=)]+)(?:\s*=\s*([0-9.]+)x([0-9.]+))?\)/g;

export const imageMdToParams = markdown => {
  // Reset regex state before executing to ensure it works on all matches
  IMAGE_REGEX.lastIndex = 0;
  const match = IMAGE_REGEX.exec(markdown);
  if (!match) return null;

  const [, alt, fullPath, width, height] = match;
  const pathParts = fullPath.split('/');

  // Ensure it matches the "placeholder/checksum.ext" structure
  if (pathParts.length < 2 || pathParts[0] !== IMAGE_PLACEHOLDER) {
    return null;
  }

  const src = pathParts.slice(1).join('/'); // The "checksum.ext" part

  return { src, alt: alt || '', width: width || null, height: height || null };
};

export const paramsToImageMd = ({ src, alt, width, height }) => {
  const fileName = src.split('/').pop();
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

  // First handle your custom syntax (images and math) as before
  processedMarkdown = processedMarkdown.replace(IMAGE_REGEX, match => {
    const params = imageMdToParams(match);
    if (!params) return match;
    return `<img src="${params.src}" alt="${params.alt}" width="${params.width}" height="${params.height}" />`;
  });

  processedMarkdown = processedMarkdown.replace(MATH_REGEX, match => {
    const params = mathMdToParams(match);
    if (!params) return match;
    return `<span data-latex="${params.latex}"></span>`;
  });

  // Use marked.js to parse the rest of the markdown
  return marked(processedMarkdown);
}
