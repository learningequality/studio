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
  'getResponseDeclarationSchema',
  'parse',
  'buildXML',
  'validate',
];

/**
 * Validates that a descriptor has every required key and returns it unchanged.
 * Throws at call-time (i.e. module import time) if any key is absent.
 *
 * Pass the Vue editor component as the second argument to attach it to the
 * descriptor here rather than mutating the descriptor after construction.
 *
 * @template {object} T
 * @param {T} descriptor - The interaction descriptor to validate
 * @param {object} editorComponent - The Vue component that edits this interaction
 * @returns {T} The same descriptor, with editorComponent attached
 * @throws {Error} If any required key is missing from the descriptor
 */
export default function defineInteraction(descriptor, editorComponent) {
  // Attach editorComponent before validation so the required-key check can
  // confirm it is present even when the descriptor class does not set it.
  descriptor.editorComponent = editorComponent;

  for (const key of REQUIRED_KEYS) {
    // Use a truthiness check for editorComponent (a Vue component object) so
    // that passing `undefined` as the second argument is caught as missing.
    const isMissing = key === 'editorComponent' ? !descriptor[key] : !(key in descriptor);
    if (isMissing) {
      const name = descriptor.type ?? '(unknown)';
      throw new Error(`defineInteraction: missing required key "${key}" on descriptor "${name}"`);
    }
  }
  return descriptor;
}
