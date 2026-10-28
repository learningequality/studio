import { Node } from '@tiptap/core';

// A top node holding one line of inline content, for fields that allow no blocks or
// line breaks.
export const InlineDocument = Node.create({
  name: 'doc',
  topNode: true,
  content: 'inline*',

  // Touch keyboards insert their newline before ProseMirror offers Enter to the keymap;
  // claiming it makes ProseMirror discard that newline.
  addKeyboardShortcuts() {
    const insertNothing = () => true;
    return { Enter: insertNothing, 'Shift-Enter': insertNothing, 'Mod-Enter': insertNothing };
  },
});
