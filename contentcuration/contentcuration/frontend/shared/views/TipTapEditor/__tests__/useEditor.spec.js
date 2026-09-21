import { useEditor } from '../TipTapEditor/composables/useEditor';

/**
 * The QTI 3.0 HTML profile has no <u> or <s>, so the item schema rejects an item that
 * carries either and the save fails. Removing the toolbar buttons is not enough on its
 * own — the marks have to leave the schema, or a keyboard shortcut or a paste still
 * produces content that cannot be saved.
 */
describe('the editor schema', () => {
  const createEditor = content => {
    const { initializeEditor, editor } = useEditor();
    initializeEditor(content);
    return editor.value;
  };

  it('carries no mark for the inline formatting a QTI item cannot hold', () => {
    const marks = Object.keys(createEditor('<p>text</p>').schema.marks);
    expect(marks).not.toContain('underline');
    expect(marks).not.toContain('strike');
  });

  it('keeps the marks a QTI item can hold', () => {
    const marks = Object.keys(createEditor('<p>text</p>').schema.marks);
    expect(marks).toContain('bold');
    expect(marks).toContain('italic');
  });

  it('unwraps underline and strikethrough it is handed, keeping the text', () => {
    const editor = createEditor('<p>a <u>b</u> and <s>c</s></p>');
    expect(editor.getHTML()).not.toContain('<u>');
    expect(editor.getHTML()).not.toContain('<s>');
    expect(editor.getText()).toContain('a b and c');
  });
});
