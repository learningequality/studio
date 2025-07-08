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

  // Image Upload
  editImage: {
    message: 'Edit image',
    context: 'Title for the image modal when editing an existing image.',
  },
  uploadImage: {
    message: 'Upload image',
    context: 'Title for the image modal when uploading a new image.',
  },
  closeModal: {
    message: 'Close modal',
    context: 'Accessibility label for the button that closes the modal window.',
  },
  cancelLoading: {
    message: 'Cancel loading',
    context: 'Button label to cancel an image upload that is in progress.',
  },
  cancel: {
    message: 'Cancel',
    context: 'Generic button label for a cancel action.',
  },
  multipleFilesDroppedWarning: {
    message: 'Multiple files were dropped. Only the first file has been selected.',
    context: 'Warning message shown when a user drops multiple files into the upload area.',
  },
  replaceFile: {
    message: 'Replace file',
    context: 'Button label to replace an existing image file.',
  },
  selectFile: {
    message: 'Select file',
    context: 'Button label to open a file picker to select an image.',
  },
  imagePreview: {
    message: 'Image preview',
    context: 'Alt text for the image preview in the upload modal.',
  },
  altTextLabel: {
    message: 'Alt text (Optional)',
    context: 'Label for the alt text input field.',
  },
  altTextPlaceholder: {
    message: 'Describe your image...',
    context: 'Placeholder text for the alt text input field.',
  },
  altTextDescription: {
    message:
      'Alt text is necessary to enable visually impaired learners to answer questions, and it also displays when the image fails to load',
    context: 'Description of the purpose and importance of alt text.',
  },
  imageDropZoneText: {
    message: 'Drag and drop an image here or upload manually',
    context: 'Instructional text inside the image drop zone.',
  },
  selectFileToUpload: {
    message: 'Select file to upload',
    context: 'Accessibility label for the button that opens the file picker.',
  },
  supportedFileTypes: {
    message: 'Supported file types: png, jpg, jpeg, svg, webp',
    context: 'A list of supported image file formats.',
  },
  removeImage: {
    message: 'Remove image',
    context: 'Button label to remove an image from the editor.',
  },
  remove: {
    message: 'Remove',
    context: 'Generic button label for a remove action.',
  },
  saveChanges: {
    message: 'Save changes',
    context: 'Button label to save changes made to an image.',
  },
  save: {
    message: 'Save',
    context: 'Generic button label for a save action.',
  },
  insert: {
    message: 'Insert',
    context: 'Generic button label for an insert action.',
  },
  defaultImageName: {
    message: 'Image',
    context: 'Default name for an image when a file name is not available.',
  },

  // Link
  goToLink: {
    message: 'Go to link',
    context: 'Text for a link that opens the URL in a new tab.',
  },
  copyLink: {
    message: 'Copy link',
    context: 'Button title to copy the link URL to the clipboard.',
  },
  editLink: {
    message: 'Edit link',
    context: 'Button title to open the link editor modal.',
  },
  edit: {
    message: 'Edit',
    context: 'Generic button label for an edit action.',
  },
  removeLink: {
    message: 'Remove link',
    context: 'Button title to remove the link from the text.',
  },
  linkActions: {
    message: 'Link actions',
    context: 'Accessibility label for the toolbar containing link-related actions.',
  },
  opensInNewTab: {
    message: '(opens in new tab)',
    context: 'Accessibility text indicating that a link will open in a new browser tab.',
  },
  addLink: {
    message: 'Add link',
    context: 'Title for the link editor modal.',
  },
  close: {
    message: 'Close',
    context: 'Generic button label or title for a close action.',
  },
  text: {
    message: 'Text',
    context: 'Label for the link text input field.',
  },
  link: {
    message: 'Link',
    context: 'Label for the link URL input field.',
  },

  // Math
  formulasMenuTitle: {
    message: 'Special Characters',
    context: 'Title for the menu containing special characters and mathematical symbols.',
  },
};

let TipTapEditorStrings = null;

export function getTipTapEditorStrings() {
  if (!TipTapEditorStrings) {
    TipTapEditorStrings = createTranslator(NAMESPACE, MESSAGES);
  }
  return TipTapEditorStrings;
}
