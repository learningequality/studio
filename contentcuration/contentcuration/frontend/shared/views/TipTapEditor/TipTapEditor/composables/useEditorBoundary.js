import { inject, provide } from 'vue';

const EditorBoundarySymbol = Symbol('tipTapEditorBoundary');

/**
 * @param {Function} isInside (target: Element) => whether a click on `target`, outside a
 *   descendant editor, leaves that editor open
 */
export function provideEditorBoundary(isInside) {
  provide(EditorBoundarySymbol, isInside);
}

export function injectEditorBoundary() {
  return inject(EditorBoundarySymbol, null);
}
