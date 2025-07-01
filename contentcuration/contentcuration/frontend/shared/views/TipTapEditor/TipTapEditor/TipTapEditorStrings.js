import { createTranslator } from 'shared/i18n';

const NAMESPACE = 'TipTapEditorStrings';

const MESSAGES = {
  // Toolbar button labels & alt text
  undo: {
    message: 'Undo',
    context: 'Button to undo the last action in the text editor',
  },
  redo: {
    message: 'Redo',
    context: 'Button to redo the last undone action in the text editor',
  },
  bold: {
    message: 'Strong',
    context: 'Button to make text bold/strong',
  },
  italic: {
    message: 'Italic',
    context: 'Button to italicize the selected text',
  },
  underline: {
    message: 'Underline',
    context: 'Button to underline the selected text',
  },
  strikethrough: {
    message: 'Strikethrough',
    context: 'Button to strikethrough the selected text',
  },
  copy: {
    message: 'Copy',
    context: 'Button to copy the selected text',
  },
  paste: {
    message: 'Paste',
    context: 'Button to paste text from clipboard',
  },
  pasteWithoutFormatting: {
    message: 'Paste without formatting',
    context: 'Button to paste text without any formatting',
  },
  bulletList: {
    message: 'Bullet list',
    context: 'Button to create a bullet list',
  },
  numberedList: {
    message: 'Numbered list',
    context: 'Button to create a numbered list',
  },
  subscript: {
    message: 'Subscript',
    context: 'Button to make text subscript',
  },
  superscript: {
    message: 'Superscript',
    context: 'Button to make text superscript',
  },
  insertImage: {
    message: 'Insert image',
    context: 'Button to insert an image',
  },
  insertLink: {
    message: 'Insert link',
    context: 'Button to insert a hyperlink',
  },
  mathFormula: {
    message: 'Math formula',
    context: 'Button to insert a mathematical formula',
  },
  codeBlock: {
    message: 'Code block',
    context: 'Button to insert a block of code',
  },

  // Format dropdown options
  formatNormal: {
    message: 'Normal',
    context: 'Option to set text format to normal',
  },
  formatSmall: {
    message: 'Small',
    context: 'Option to set text format to small',
  },
  formatHeader1: {
    message: 'Header 1',
    context: 'Option to set text format to header 1',
  },
  formatHeader2: {
    message: 'Header 2',
    context: 'Option to set text format to header 2',
  },
  formatHeader3: {
    message: 'Header 3',
    context: 'Option to set text format to header 3',
  },

  // Accessibility labels
  textFormattingToolbar: {
    message: 'Text formatting toolbar',
    context: 'Toolbar for text formatting options',
  },
  historyActions: {
    message: 'History actions',
    context: 'Actions for managing history of changes',
  },
  textFormattingOptions: {
    message: 'Text formatting options',
    context: 'Options for formatting text',
  },
  textStyleFormatting: {
    message: 'Text style formatting',
    context: 'Formatting options for text styles',
  },
  copyAndPasteActions: {
    message: 'Copy and paste actions',
    context: 'Actions for copying and pasting text',
  },
  listFormatting: {
    message: 'List formatting',
    context: 'Options for formatting lists',
  },
  scriptFormatting: {
    message: 'Script formatting',
    context: 'Options for formatting scripts',
  },
  insertTools: {
    message: 'Insert tools',
    context: 'Tools for inserting elements into the text',
  },
  textFormatOptions: {
    message: 'Text format options',
    context: 'Options for text formatting',
  },
  formatOptions: {
    message: 'Format options',
    context: 'General options for formatting',
  },
  pasteOptions: {
    message: 'Paste options',
    context: 'Options for pasting text',
  },
  pasteOptionsMenu: {
    message: 'Paste options menu',
    context: 'Menu for selecting paste options',
  },
  clipboardAccessFailed: {
    message: 'Clipboard access failed. Try copying again.',
    context: 'Message shown when clipboard access fails during paste operation',
  },
};

let TipTapEditorStrings = null;

export function getTipTapEditorStrings() {
  if (!TipTapEditorStrings) {
    TipTapEditorStrings = createTranslator(NAMESPACE, MESSAGES);
  }
  return TipTapEditorStrings;
}
