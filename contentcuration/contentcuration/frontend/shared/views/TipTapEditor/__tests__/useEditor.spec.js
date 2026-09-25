import { Node } from '@tiptap/core';
import { useEditor } from '../TipTapEditor/composables/useEditor';
import { stubProseMirrorLayout } from 'shared/utils/testing';

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

describe('the insert context', () => {
  const Widget = Node.create({
    name: 'widget',
    group: 'inline',
    inline: true,
    atom: true,
    parseHTML: () => [{ tag: 'span[data-widget]' }],
    renderHTML: () => ['span', { 'data-widget': '' }],
  });

  const createEditor = content => {
    const { initializeEditor, editor, insertContext } = useEditor();
    initializeEditor(content, 'edit', { extensions: [Widget] });
    return { editor: editor.value, context: () => insertContext.value };
  };

  beforeAll(stubProseMirrorLayout);

  it.each([
    [
      'two paragraphs',
      '<p>one two</p><p>three</p>',
      e => e.commands.setTextSelection({ from: 3, to: 12 }),
      true,
    ],
    [
      'across a hard break',
      '<p>one two<br>three four</p>',
      e => e.commands.setTextSelection({ from: 3, to: 12 }),
      true,
    ],
    [
      'select-all over two paragraphs',
      '<p>one two</p><p>three</p>',
      e => e.commands.selectAll(),
      true,
    ],
    [
      'within one line',
      '<p>one two</p>',
      e => e.commands.setTextSelection({ from: 2, to: 5 }),
      false,
    ],
    [
      'up to a hard break',
      '<p>one two<br>three</p>',
      e => e.commands.setTextSelection({ from: 2, to: 8 }),
      false,
    ],
    [
      'after a hard break',
      '<p>one two<br>three</p>',
      e => e.commands.setTextSelection({ from: 9, to: 12 }),
      false,
    ],
    [
      'a selected inline node',
      '<p>a<span data-widget></span>b</p>',
      e => e.commands.setNodeSelection(2),
      false,
    ],
  ])('spansLines: %s', (_, content, select, expected) => {
    const { editor, context } = createEditor(content);
    select(editor);
    expect(context().selection.spansLines).toBe(expected);
  });

  it('reports whether the selection is empty', () => {
    const { editor, context } = createEditor('<p>one two</p>');
    editor.commands.setTextSelection(2);
    expect(context().selection.empty).toBe(true);
    editor.commands.setTextSelection({ from: 2, to: 5 });
    expect(context().selection.empty).toBe(false);
  });

  it.each([
    [
      'math in a code block',
      '<pre><code>let x</code></pre>',
      e => e.commands.setTextSelection(3),
      'math',
      false,
    ],
    ['math in a paragraph', '<p>one two</p>', e => e.commands.setTextSelection(2), 'math', true],
    ['an unknown type', '<p>one two</p>', e => e.commands.setTextSelection(2), 'noSuchNode', false],
    [
      'a widget over a selected widget',
      '<p>a<span data-widget></span>b</p>',
      e => e.commands.setNodeSelection(2),
      'widget',
      true,
    ],
  ])('canInsertNode: %s', (_, content, select, typeName, expected) => {
    const { editor, context } = createEditor(content);
    select(editor);
    expect(context().canInsertNode(typeName)).toBe(expected);
  });

  it('keeps hasCursor once the editor has been focused', () => {
    const { editor, context } = createEditor('<p>one two</p>');
    document.body.appendChild(editor.view.dom.parentNode);
    expect(context().selection.hasCursor).toBe(false);
    editor.view.dom.focus();
    expect(context().selection.hasCursor).toBe(true);
    editor.view.dom.blur();
    expect(context().selection.hasCursor).toBe(true);
  });
});
