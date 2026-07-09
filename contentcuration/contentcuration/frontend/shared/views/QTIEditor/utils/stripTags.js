/**
 * Strips HTML/XML tags from a string.
 * @param {string} html
 * @returns {string}
 */
export function stripTags(html) {
  return (html ?? '').replace(/<[^>]*>/g, '');
}
