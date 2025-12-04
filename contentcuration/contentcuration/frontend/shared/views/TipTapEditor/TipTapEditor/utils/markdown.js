// Contains utilities for handling Markdown content bidirectional conversion in TipTap editor.
// eslint-disable-next-line import/namespace
import { marked } from 'marked';
import { storageUrl } from '../../../../vuex/file/utils';

// --- Image Translation ---
export const IMAGE_PLACEHOLDER = '${☣ CONTENTSTORAGE}';
export const IMAGE_REGEX = /!\[([^\]]*)\]\(([^/]+\/[^\s=)]+)(?:\s*=\s*([0-9.]+)x([0-9.]+))?\)/g;

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

  const fileName = sourceToSave.split('/').pop();
  if (Number.isFinite(+width) && Number.isFinite(+height)) {
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

export function sanitizePastedHTML(html) {
  if (!html) return '';
  // This code ine 55 to 66 is geneted with the help of LLM with the prompt
  // "Create a function that sanitizes HTML pasted from Microsoft
  // Word by removing Word-specific tags, styles, and classes while preserving other formatting."
  let cleaned = html;
  cleaned = cleaned.replace(/<!--\[if.*?endif\]-->/gis, '');
  cleaned = cleaned.replace(/<\/?(w|m|o|v):[^>]*>/gis, '');
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, 'text/html');
  doc.querySelectorAll('*').forEach(el => {
    if (el.hasAttribute('style')) {
      const style = el.getAttribute('style') || '';
      const filtered = style
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.toLowerCase().startsWith('mso-'))
        .join('; ');
      if (filtered) {
        el.setAttribute('style', filtered);
      } else {
        el.removeAttribute('style');
      }
    }
    if (el.hasAttribute('class')) {
      const cls = el
        .getAttribute('class')
        .split(/\s+/)
        .filter(c => c && !/^Mso/i.test(c))
        .join(' ');
      if (cls) {
        el.setAttribute('class', cls);
      } else {
        el.removeAttribute('class');
      }
    }
  });
  const strikeElements = doc.querySelectorAll('s, strike, del');
  strikeElements.forEach(el => {
    const nestedLists = el.querySelectorAll('ul, ol');
    if (nestedLists.length > 0) {
      nestedLists.forEach(list => {
        el.parentNode.insertBefore(list, el.nextSibling);
      });
    }
  });
  const lists = doc.querySelectorAll('ul, ol');
  lists.forEach(list => {
    const items = list.querySelectorAll(':scope > li');
    items.forEach(item => {
      const nestedLists = Array.from(item.children).filter(
        child => child.tagName === 'UL' || child.tagName === 'OL',
      );
      nestedLists.forEach(nestedList => {
        item.appendChild(nestedList);
      });
    });
  });
  return doc.body.innerHTML;
}

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
  let html = marked(processedMarkdown);

  html = sanitizePastedHTML(html);

  return html;
}
