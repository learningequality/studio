import TiptapCodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

export const CodeBlockSyntaxHighlight = TiptapCodeBlockLowlight.configure({
  lowlight,
  HTMLAttributes: {
    spellcheck: 'false',
  },
});
