import { readonly, ref } from 'vue';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { AllSelection } from '@tiptap/pm/state';
import { qtiEditorStrings } from '../../qtiEditorStrings';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { InlineChoiceNode, findChip } from './InlineChoiceNode';
import { providePassageSelection } from './passageSelection';

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
 * setup of the component that renders the editor, so the chips can reach the selection.
 * `selectedResponseIdentifier` names a chip in the passage, or is `null`.
 */
export function useInlineChoicePassage() {
  const selectedResponseIdentifier = ref(null);

  function selectDropdown(responseIdentifier) {
    selectedResponseIdentifier.value = responseIdentifier;
  }

  const passageSelection = {
    selectedResponseIdentifier: readonly(selectedResponseIdentifier),
    selectDropdown,
  };
  providePassageSelection(passageSelection);

  // Undo, delete or cut can take the selected chip out of the passage.
  const node = InlineChoiceNode.extend({
    onUpdate() {
      if (selectedResponseIdentifier.value === null) return;
      if (!findChip(this.editor.state.doc, selectedResponseIdentifier.value)) selectDropdown(null);
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
      selectDropdown(responseIdentifier);
    },
  };

  return {
    extensions: [node],
    insertActions: [insertAction],
    ...passageSelection,
  };
}
