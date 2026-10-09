import StarterKitExtension from '@tiptap/starter-kit';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Small } from './SmallTextExtension';
import { StyledStrike, StyledUnderline } from './TextDecoration';
import { Image } from './Image';
import { CodeBlockSyntaxHighlight } from './CodeBlockSyntaxHighlight';
import { Math } from './Math';
import { InlineDocument } from './InlineDocument';

// Inline-only fields leave every block node and the line break out of the schema,
// so no command, shortcut or input rule has one to create.
const INLINE_ONLY_STARTER_KIT = {
  document: false,
  paragraph: false,
  heading: false,
  blockquote: false,
  bulletList: false,
  orderedList: false,
  listItem: false,
  listKeymap: false,
  horizontalRule: false,
  hardBreak: false,
  trailingNode: false,
};

export function editorExtensions({ inlineOnly = false } = {}) {
  return [
    StarterKitExtension.configure({
      codeBlock: false, // Disable default code block to use the extended version
      // A link has nothing to navigate to on a device with no internet access, so
      // the editor offers none and the legacy conversion unwraps the ones it finds
      // (utils/assessment/qti/convert.py). Dropping the mark rather than only the
      // toolbar button is what keeps a pasted anchor from arriving as one.
      link: false,
      // Replaced by the versions in extensions/TextDecoration.js, which write the
      // decoration as a style on a <span> — the QTI 3.0 HTML profile has no <u> or <s>.
      strike: false,
      underline: false,
      ...(inlineOnly && INLINE_ONLY_STARTER_KIT),
    }),
    ...(inlineOnly
      ? [InlineDocument]
      : [
          CodeBlockSyntaxHighlight,
          Small,
          Image,
          TextAlign.configure({
            types: ['heading', 'paragraph', 'image', 'small'],
          }),
        ]),
    StyledStrike,
    StyledUnderline,
    Superscript,
    Subscript,
    Math,
  ];
}
