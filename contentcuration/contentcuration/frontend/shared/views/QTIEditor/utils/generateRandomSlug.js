/**
 * Generate a QTI-safe identifier with the given prefix.
 *
 * @param {string} prefix
 * @returns {string}
 */
export function generateRandomSlug(prefix) {
  const slug = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${slug}`;
}
