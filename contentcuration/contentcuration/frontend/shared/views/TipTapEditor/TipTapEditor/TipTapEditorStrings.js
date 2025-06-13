import { createTranslator } from "shared/i18n";

const NAMESPACE = "TipTapEditorStrings";

const MESSAGES = {
  // Toolbar button labels & alt text
  undo: "Undo",
  redo: "Redo",
  bold: "Strong",
  italic: "Italic",
  underline: "Underline",
  strikethrough: "Strikethrough",
  copy: "Copy",
  paste: "Paste",
  pasteWithoutFormatting: "Paste without formatting",
  bulletList: "Bullet list",
  numberedList: "Numbered list",
  subscript: "Subscript",
  superscript: "Superscript",
  insertImage: "Insert image",
  insertLink: "Insert link",
  mathFormula: "Math formula",
  codeBlock: "Code block",

  // Format dropdown options
  formatNormal: "Normal",
  formatSmall: "Small",
  formatHeader1: "Header 1",
  formatHeader2: "Header 2",
  formatHeader3: "Header 3",

  // Accessibility labels
  textFormattingToolbar: "Text formatting toolbar",
  historyActions: "History actions",
  textFormattingOptions: "Text formatting options",
  textStyleFormatting: "Text style formatting",
  copyAndPasteActions: "Copy and paste actions",
  listFormatting: "List formatting",
  scriptFormatting: "Script formatting",
  insertTools: "Insert tools",
  textFormatOptions: "Text format options",
  formatOptions: "Format options",
  pasteOptions: "Paste options",
  pasteOptionsMenu: "Paste options menu"
};

let translator = null;

export function getTranslator() {
  if (!translator) {
    translator = createTranslator(NAMESPACE, MESSAGES);
  }
  return translator;
}