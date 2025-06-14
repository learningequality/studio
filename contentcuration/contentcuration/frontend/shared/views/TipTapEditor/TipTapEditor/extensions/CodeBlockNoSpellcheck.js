import { CodeBlock } from '@tiptap/extension-code-block';

export const CodeBlockNoSpellcheck = CodeBlock.extend({
  renderHTML({ HTMLAttributes }) {
    return ['pre', { spellcheck: 'false' }, ['code', HTMLAttributes, 0]];
  },
});
