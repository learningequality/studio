import { computed, readonly, ref, unref } from 'vue';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { AllSelection } from '@tiptap/pm/state';
import { qtiEditorStrings } from '../../qtiEditorStrings';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { InlineChoiceNode, findChip } from './InlineChoiceNode';
import { providePassageChips } from './passageChips';

// Select-all selects the passage itself, where an inline node cannot go. Over a passage of one
// paragraph, it is taken as that paragraph's text.
function paragraphOfAllSelection({ doc, selection, schema }) {
  const only = doc.childCount === 1 ? doc.firstChild : null;
  const holdsChip = only && only.type.contentMatch.matchType(schema.nodes[InlineChoiceNode.name]);
  if (!(selection instanceof AllSelection) || !holdsChip) return null;
  return { from: 1, to: doc.content.size - 1 };
}

/**
 * Everything a passage's `TipTapEditor` needs to hold inline choice dropdowns. Call from the
 * setup of the component that renders the editor, so the chips can reach what it provides.
 * `openResponseIdentifier` names the chip whose options panel is open, or is `null`.
 * `errorResponseIdentifiers` (array or ref) names the dropdowns with validation errors.
 */
export function useInlineChoicePassage({ errorResponseIdentifiers = [] } = {}) {
  const openResponseIdentifier = ref(null);
  // `setEditable` emits `update`; `editor.isEditable` itself is not reactive.
  const isEditable = ref(false);
  let editor = null;

  function openDropdown(responseIdentifier) {
    openResponseIdentifier.value = responseIdentifier;
  }

  function focusChip(responseIdentifier) {
    if (!editor) return;
    const found = findChip(editor.state.doc, responseIdentifier);
    if (found) editor.view.nodeDOM(found.pos).querySelector('button')?.focus();
    else editor.commands.focus();
  }

  const readonlyOpenResponseIdentifier = readonly(openResponseIdentifier);
  providePassageChips({
    openResponseIdentifier: readonlyOpenResponseIdentifier,
    openDropdown,
    focusChip,
    isEditable: readonly(isEditable),
    errorResponseIdentifiers: computed(() => unref(errorResponseIdentifiers)),
  });

  const node = InlineChoiceNode.extend({
    onCreate() {
      editor = this.editor;
      isEditable.value = editor.isEditable;
    },
    onDestroy() {
      editor = null;
    },
    onUpdate() {
      isEditable.value = this.editor.isEditable;
      // Undo, delete or cut can take the open chip out of the passage.
      if (openResponseIdentifier.value === null) return;
      if (!findChip(this.editor.state.doc, openResponseIdentifier.value)) openDropdown(null);
    },
  });

  const insertAction = {
    name: InlineChoiceNode.name,
    title: qtiEditorStrings.insertInlineChoice$(),
    icon: 'add',
    prominent: true,
    // Before focus, the chip goes at the end of the passage, which always takes one.
    // Replacing a multi-line selection with an inline node would join the lines.
    isAvailable: ({ editor, selection, canInsertNode }) =>
      !selection.hasCursor ||
      (!selection.spansLines &&
        (canInsertNode(InlineChoiceNode.name) || Boolean(paragraphOfAllSelection(editor.state)))),
    handler: ({ editor, selection }) => {
      const responseIdentifier = generateRandomSlug('response');
      const paragraph = paragraphOfAllSelection(editor.state);
      let chain = editor.chain().focus(selection.hasCursor ? undefined : 'end');
      if (paragraph) chain = chain.setTextSelection(paragraph);
      chain.insertInlineChoice(responseIdentifier).run();
      openDropdown(responseIdentifier);
    },
  };

  return {
    extensions: [node],
    insertActions: [insertAction],
    openResponseIdentifier: readonlyOpenResponseIdentifier,
    openDropdown,
    focusChip,
  };
}
