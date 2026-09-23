import { Node } from '@tiptap/core';
import { useEditor } from '../TipTapEditor/composables/useEditor';
import { transformPastedHTML } from '../TipTapEditor/utils/pasteTransform';
import { stubProseMirrorLayout } from 'shared/utils/testing';

/**
 * The QTI 3.0 HTML profile has no <u> or <s>, so an item carrying either is rejected by
 * the item schema. It does have <span>, and the schema admits a `style` attribute, so
 * both decorations are written as a styled span instead of their own element.
 */
describe('the editor schema', () => {
  const createEditor = content => {
    const { initializeEditor, editor } = useEditor();
    initializeEditor(content);
    return editor.value;
  };

  // Read back through the DOM rather than matched as a string: the style attribute is
  // serialized by the browser, which is free to normalize the declaration it is given.
  const spansIn = html => {
    const container = document.createElement('div');
    container.innerHTML = html;
    return Array.from(container.querySelectorAll('span')).map(span => ({
      text: span.textContent,
      style: span.getAttribute('style'),
    }));
  };

  it('keeps the marks a QTI item can hold', () => {
    const marks = Object.keys(createEditor('<p>text</p>').schema.marks);
    expect(marks).toEqual(expect.arrayContaining(['bold', 'italic', 'underline', 'strike']));
  });

  it('writes underline as a decorated span, not a <u>', () => {
    const editor = createEditor('<p>text</p>');
    editor.commands.selectAll();
    editor.commands.toggleUnderline();

    expect(spansIn(editor.getHTML())).toEqual([
      { text: 'text', style: expect.stringContaining('text-decoration: underline') },
    ]);
    expect(editor.getHTML()).not.toContain('<u>');
  });

  it('writes strikethrough as a decorated span, not an <s>', () => {
    const editor = createEditor('<p>text</p>');
    editor.commands.selectAll();
    editor.commands.toggleStrike();

    expect(spansIn(editor.getHTML())).toEqual([
      { text: 'text', style: expect.stringContaining('text-decoration: line-through') },
    ]);
    expect(editor.getHTML()).not.toContain('<s>');
  });

  it('reads back the decorated spans it writes', () => {
    // A <span> is no node in this schema, so it survives the round trip only by being
    // read as the mark that wrote it.
    const editor = createEditor(
      '<p><span style="text-decoration: underline">a</span>' +
        '<span style="text-decoration: line-through">b</span></p>',
    );

    expect(spansIn(editor.getHTML())).toEqual([
      { text: 'a', style: expect.stringContaining('text-decoration: underline') },
      { text: 'b', style: expect.stringContaining('text-decoration: line-through') },
    ]);
  });

  it('carries no link mark, so a pasted anchor arrives as its text', () => {
    // A link has nothing to navigate to on a device with no internet access, and the
    // legacy conversion unwraps the ones it finds. Removing the button is not enough
    // on its own — the mark has to leave the schema, or a paste still brings one in.
    const editor = createEditor('<p>see <a href="https://example.com">the docs</a></p>');

    expect(Object.keys(editor.schema.marks)).not.toContain('link');
    expect(editor.getHTML()).not.toContain('<a ');
    expect(editor.getText()).toBe('see the docs');
  });

  it('turns a pasted <u> or <s> into a decorated span', () => {
    const editor = createEditor('<p>a <u>b</u> and <s>c</s></p>');

    expect(spansIn(editor.getHTML())).toEqual([
      { text: 'b', style: expect.stringContaining('text-decoration: underline') },
      { text: 'c', style: expect.stringContaining('text-decoration: line-through') },
    ]);
  });
});

/**
 * A pasted decoration is what this schema had no mark for until now: the two were
 * switched off in StarterKit, so a <u> or a decorated <span> arrived as plain text.
 * Google Docs writes a decoration as a style on a <span>, which is also how the marks
 * re-registered here write one, so a pasted run comes back as the mark that publishes it.
 */
describe('a pasted decoration', () => {
  const pasteIntoEditor = html => {
    const { initializeEditor, editor } = useEditor();
    initializeEditor(transformPastedHTML(html));
    const container = document.createElement('div');
    container.innerHTML = editor.value.getHTML();
    return Array.from(container.querySelectorAll('span')).map(span => ({
      text: span.textContent,
      style: span.getAttribute('style'),
    }));
  };

  it('reads the decorated spans Google Docs writes back as their marks', () => {
    // Docs wraps its clipboard HTML in a <b style="font-weight:normal">, a container
    // rather than a bold run, so the decorations inside it are what must survive.
    const html =
      '<b style="font-weight:normal" id="docs-internal-guid-x">' +
      '<p><span style="text-decoration:underline">under</span>' +
      '<span style="text-decoration:line-through">struck</span></p></b>';

    expect(pasteIntoEditor(html)).toEqual([
      { text: 'under', style: expect.stringContaining('text-decoration: underline') },
      { text: 'struck', style: expect.stringContaining('text-decoration: line-through') },
    ]);
  });

  it('reads a pasted <u> or <s> back as the same marks', () => {
    expect(pasteIntoEditor('<p><u>under</u><s>struck</s></p>')).toEqual([
      { text: 'under', style: expect.stringContaining('text-decoration: underline') },
      { text: 'struck', style: expect.stringContaining('text-decoration: line-through') },
    ]);
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

  let editors = [];

  const createEditor = content => {
    const { initializeEditor, editor, insertContext } = useEditor();
    initializeEditor(content, 'edit', { extensions: [Widget] });
    editors.push(editor.value);
    return { editor: editor.value, context: () => insertContext.value };
  };

  afterEach(() => {
    editors.forEach(editor => editor.destroy());
    editors = [];
    document.body.replaceChildren();
  });

  stubProseMirrorLayout();

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
