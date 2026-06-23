/**
 * Required keys every interaction descriptor must provide.
 * Validated at import time so missing fields surface immediately during development.
 */
const REQUIRED_KEYS = [
  'type',
  'placement',
  'questionTypes',
  'editorComponent',
  'convertsFrom',
  'matches',
  'getQuestionType',
  'getDeclarationSchema',
  'parse',
  'validate',
];

/**
 * Validates that a descriptor has every required key and returns it unchanged.
 * Throws at call-time (i.e. module import time) if any key is absent.
 *
 * @template {object} T
 * @param {T} descriptor - The interaction descriptor to validate
 * @returns {T} The same descriptor, unmodified
 * @throws {Error} If any required key is missing from the descriptor
 */
export default function defineInteraction(descriptor) {
  for (const key of REQUIRED_KEYS) {
    if (!(key in descriptor)) {
      const name = descriptor.type ?? '(unknown)';
      throw new Error(`defineInteraction: missing required key "${key}" on descriptor "${name}"`);
    }
  }
  return descriptor;
}
