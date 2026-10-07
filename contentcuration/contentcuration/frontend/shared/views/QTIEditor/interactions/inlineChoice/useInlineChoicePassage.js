import { computed, readonly, ref, unref } from 'vue';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { AllSelection } from '@tiptap/pm/state';
import { findChildren } from '@tiptap/core';
import { qtiEditorStrings } from '../../qtiEditorStrings';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { InlineChoiceNode, findChip, isChip } from './InlineChoiceNode';
import { providePassageChips } from './passageChips';
import { storedHTML } from 'shared/views/TipTapEditor/TipTapEditor/utils/imageSrc';

// Select-all selects the passage itself, where an inline node cannot go. Over a passage of one
// paragraph, it is taken as that paragraph's text.
function paragraphOfAllSelection({ doc, selection, schema }) {
  const only = doc.childCount === 1 ? doc.firstChild : null;
  const holdsChip = only && only.type.contentMatch.matchType(schema.nodes[InlineChoiceNode.name]);
  if (!(selection instanceof AllSelection) || !holdsChip) return null;
  return { from: 1, to: doc.content.size - 1 };
}

/** Whether two documents hold the same chips, in the same order, with the same options. */
function sameChips(prevDoc, doc) {
  const before = findChildren(prevDoc, isChip);
  const after = findChildren(doc, isChip);
  return before.length === after.length && before.every(({ node }, i) => node.eq(after[i].node));
}

/** The response identifiers of the chips in `doc` that `prevDoc` lacks or holds otherwise. */
function changedChips(prevDoc, doc) {
  const before = new Map(
    findChildren(prevDoc, isChip).map(({ node }) => [node.attrs.responseIdentifier, node]),
  );
  return findChildren(doc, isChip)
    .map(({ node }) => node)
    .filter(node => !before.get(node.attrs.responseIdentifier)?.eq(node))
    .map(node => node.attrs.responseIdentifier);
}

/**
 * Everything a passage's `TipTapEditor` needs to hold inline choice dropdowns. Call from the
 * setup of the component that renders the editor, so the chips can reach what it provides.
 * `openResponseIdentifier` names the chip whose options panel is open, or is `null`.
 * `errorResponseIdentifiers` (array or ref) names the dropdowns with validation errors.
 * `showAnswers` (boolean or ref) is whether a read-only passage shows each correct answer.
 *
 * `onChange` receives the passage's HTML after every change to its chips, and while a dropdown
 * is open after every change at all, which `TipTapEditor` itself only reports on blur. The
 * options panel, outside the editor, edits the passage through `updateDropdown` and has to show
 * each edit, and each undo, as it happens; and the question's validation has to follow chips
 * removed or restored in the passage.
 */
export function useInlineChoicePassage({
  errorResponseIdentifiers = [],
  showAnswers = true,
  onChange = () => {},
} = {}) {
  const openResponseIdentifier = ref(null);
  // `setEditable` emits `update`; `editor.isEditable` itself is not reactive.
  const isEditable = ref(false);
  let editor = null;

  const syncPassage = () => onChange(storedHTML(editor));

  function openDropdown(responseIdentifier) {
    openResponseIdentifier.value = responseIdentifier;
    // The panel reads the dropdown from the synced passage, which may not hold it yet.
    if (editor && responseIdentifier !== null) syncPassage();
  }

  function focusChip(responseIdentifier) {
    if (!editor) return;
    const found = findChip(editor.state.doc, responseIdentifier);
    if (found) editor.view.nodeDOM(found.pos).querySelector('button')?.focus();
    else editor.commands.focus();
  }

  /**
   * One step of the passage's history, so undo restores what the panel showed before it.
   *
   * @param {string} responseIdentifier
   * @param {{ options?: Array<{id: string, text: string}>, correctId?: string|null }} change
   * @returns {boolean} false when there is no such chip, or the change would leave it invalid
   */
  function updateDropdown(responseIdentifier, change) {
    return Boolean(editor?.commands.updateInlineChoice(responseIdentifier, change));
  }

  /**
   * Steps through the passage's history, which holds the panel's edits too. A step that changes
   * another chip than the open one opens that chip, where it can be seen.
   */
  function stepHistory(direction) {
    if (!editor) return;
    const prevDoc = editor.state.doc;
    editor.commands[direction]();
    const open = openResponseIdentifier.value;
    const changed = changedChips(prevDoc, editor.state.doc);
    if (open !== null && changed.length && !changed.includes(open)) openDropdown(changed[0]);
  }

  const readonlyOpenResponseIdentifier = readonly(openResponseIdentifier);
  providePassageChips({
    openResponseIdentifier: readonlyOpenResponseIdentifier,
    openDropdown,
    focusChip,
    isEditable: readonly(isEditable),
    errorResponseIdentifiers: computed(() => unref(errorResponseIdentifiers)),
    showAnswers: computed(() => unref(showAnswers)),
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
    },
    onTransaction({ transaction }) {
      if (!transaction.docChanged) return;
      const isOpen = openResponseIdentifier.value !== null;
      if (!isOpen && sameChips(transaction.before, transaction.doc)) return;
      syncPassage();
      // Undo, delete or cut can take the open chip out of the passage.
      if (isOpen && !findChip(transaction.doc, openResponseIdentifier.value)) openDropdown(null);
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
    updateDropdown,
    undo: () => stepHistory('undo'),
    redo: () => stepHistory('redo'),
  };
}
