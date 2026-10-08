import { Node } from '@tiptap/core';
import { useEditor } from '../TipTapEditor/composables/useEditor';
import { transformPastedHTML } from '../TipTapEditor/utils/pasteTransform';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom has no ClipboardEvent, which is what the paste methods build without one.
const pasteEvent = () => new Event('paste');

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
 * An inline-only editor has no block nodes or line breaks at all: a block command,
 * input rule or line-break key then has nothing to create.
 */
describe('the inline-only schema', () => {
  const INLINE_ELEMENTS = ['strong', 'em', 'span', 'sub', 'sup', 'code'];

  let editors = [];

  const createEditor = content => {
    const { initializeEditor, editor } = useEditor();
    initializeEditor(content, 'edit', { inlineOnly: true });
    editors.push(editor.value);
    return editor.value;
  };

  const elementsIn = html => {
    const container = document.createElement('div');
    container.innerHTML = html;
    return Array.from(container.querySelectorAll('*'), element => element.localName);
  };

  // Input rules run from the view's text input handler, one character at a time.
  const type = (editor, text) => {
    for (const char of text) {
      const { from, to } = editor.state.selection;
      const handled = editor.view.someProp('handleTextInput', handler =>
        handler(editor.view, from, to, char),
      );
      if (!handled) editor.view.dispatch(editor.state.tr.insertText(char, from, to));
    }
  };

  afterEach(() => {
    editors.forEach(editor => editor.destroy());
    editors = [];
  });

  it('writes every offered feature as inline elements only', () => {
    const editor = createEditor(
      '<strong>b</strong><em>i</em>' +
        '<span style="text-decoration: underline">u</span>' +
        '<span style="text-decoration: line-through">s</span>' +
        '<sub>1</sub><sup>2</sup><code>c</code><span data-latex="x^2"></span>',
    );
    const html = editor.getHTML();

    expect([...new Set(elementsIn(html))].sort()).toEqual([...INLINE_ELEMENTS].sort());
    expect(html).toContain('data-latex="x^2"');
  });

  it.each([
    ['heading', 'Mod-Alt-1'],
    ['bullet list', 'Mod-Shift-8'],
    ['ordered list', 'Mod-Shift-7'],
    ['blockquote', 'Mod-Shift-b'],
    ['code block', 'Mod-Alt-c'],
    ['small text', 'Mod-Shift-S'],
  ])('creates no block from the %s shortcut', (_, shortcut) => {
    const editor = createEditor('text');
    editor.commands.focus('end');
    editor.commands.keyboardShortcut(shortcut);

    expect(elementsIn(editor.getHTML())).toEqual([]);
    expect(editor.getText()).toBe('text');
  });

  it.each([
    ['heading', '# '],
    ['bullet list', '- '],
    ['ordered list', '1. '],
    ['blockquote', '> '],
    ['code block', '```'],
    ['horizontal rule', '---'],
  ])('creates no block from the %s input rule', (_, typed) => {
    const editor = createEditor('');
    type(editor, typed);

    expect(elementsIn(editor.getHTML())).toEqual([]);
    expect(editor.getText()).toBe(typed);
  });

  // Touch keyboards edit the DOM before ProseMirror offers Enter to the keymap;
  // an unclaimed Enter lets their newline into the doc.
  it.each([
    ['Enter', {}],
    ['Shift-Enter', { shiftKey: true }],
    ['Mod-Enter', { ctrlKey: true }],
  ])('claims %s and inserts nothing', (_, modifiers) => {
    const editor = createEditor('ab');
    editor.commands.setTextSelection(1);
    const enter = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, ...modifiers });

    expect(editor.view.someProp('handleKeyDown', handler => handler(editor.view, enter))).toBe(
      true,
    );
    expect(editor.getHTML()).toBe('ab');
  });

  it.each(['insertParagraph', 'insertLineBreak'])('cancels the %s input', inputType => {
    const editor = createEditor('ab');
    const input = new InputEvent('beforeinput', { inputType, cancelable: true });
    editor.view.dom.dispatchEvent(input);

    expect(input.defaultPrevented).toBe(true);
  });

  it('lets the insertText input through', () => {
    const editor = createEditor('ab');
    const input = new InputEvent('beforeinput', { inputType: 'insertText', cancelable: true });
    editor.view.dom.dispatchEvent(input);

    expect(input.defaultPrevented).toBe(false);
  });

  it('undoes an edit', () => {
    const editor = createEditor('a');
    editor.commands.focus('end');
    editor.commands.insertContent('b');
    editor.commands.undo();

    expect(editor.getHTML()).toBe('a');
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
});

/**
 * ProseMirror joins the text of blocks an inline-only schema cannot hold with nothing
 * between them, so a paste would weld the last word of one line to the next.
 */
describe('a paste into an inline-only editor', () => {
  let editor;

  beforeEach(() => {
    const { initializeEditor, editor: instance } = useEditor();
    initializeEditor('', 'edit', { inlineOnly: true });
    editor = instance.value;
  });

  afterEach(() => {
    editor.destroy();
  });

  it('arrives as one run keeping its marks and math', () => {
    editor.view.pasteHTML(
      '<h1>Title</h1><ul><li><strong>bold</strong></li>' +
        '<li>math <span data-latex="x^2"></span></li></ul>',
      pasteEvent(),
    );

    expect(editor.getHTML()).toBe(
      'Title <strong>bold</strong> math <span data-latex="x^2"></span>',
    );
  });

  it('reads the Google Docs wrapper as a container, not a bold run', () => {
    editor.view.pasteHTML(
      '<b style="font-weight:normal" id="docs-internal-guid-x"><p>one</p><p>two</p></b>',
      pasteEvent(),
    );

    expect(editor.getHTML()).toBe('one two');
  });

  it('joins the lines of plain text with a space', () => {
    editor.view.pasteText('one \ntwo\r\n\r\n three', pasteEvent());

    expect(editor.getHTML()).toBe('one two three');
  });

  it("drops the placeholder breaks of a full editor's empty and hard-break-ended lines", () => {
    editor.view.pasteHTML(
      '<p>one</p><p><br class="ProseMirror-trailingBreak"></p>' +
        '<p>two<br><br class="ProseMirror-trailingBreak"></p><p>three</p>',
      pasteEvent(),
    );

    expect(editor.getHTML()).toBe('one two three');
  });

  it("separates a full editor's small text lines", () => {
    editor.view.pasteHTML(
      '<p>Intro</p><small class="small-text">first line</small>' +
        '<small class="small-text">second line</small><p>end</p>',
      pasteEvent(),
    );

    expect(editor.getHTML()).toBe('Intro first line second line end');
  });

  it('separates blocks with a comment between them', () => {
    editor.view.pasteHTML('<p>one</p><!-- note --><p>two</p>', pasteEvent());

    expect(editor.getHTML()).toBe('one two');
  });

  it.each([
    [
      'Excel',
      '<table><!--StartFragment--><col width=64><col width=64>' +
        '<tr><td>red</td><td>blue</td></tr><!--EndFragment--></table>',
      'red blue',
    ],
    [
      'LibreOffice Calc',
      '<table><colgroup width="85"></colgroup><tr><td>red</td><td>blue</td></tr></table>',
      'red blue',
    ],
    [
      'a table after text',
      'Intro<table><colgroup><col></colgroup><tr><td>red</td><td>blue</td></tr></table>',
      'Intro red blue',
    ],
  ])('keeps the text of a spreadsheet paste from %s', (_, html, expected) => {
    editor.view.pasteHTML(html, pasteEvent());

    expect(editor.getHTML()).toBe(expected);
  });

  it.each([
    ['<p>one</p><br><p>two</p>', 'one two'],
    ['one<br>\n    two', 'one two'],
    ['<strong>one</strong><br> <em>two</em>', '<strong>one</strong> <em>two</em>'],
  ])('turns a line break into one space in %j', (html, expected) => {
    editor.view.pasteHTML(html, pasteEvent());

    expect(editor.getHTML()).toBe(expected);
  });
});

/**
 * A copy carries markup around its content, and a ProseMirror copy the blocks it was
 * cut from, which an inline-only editor has none of.
 */
describe('a copy pasted into an inline-only editor', () => {
  let editors = [];

  const createEditor = (content, inlineOnly) => {
    const { initializeEditor, editor } = useEditor();
    initializeEditor(content, 'edit', { inlineOnly });
    editors.push(editor.value);
    return editor.value;
  };

  const copy = (editor, from, to) =>
    editor.view.serializeForClipboard(editor.state.doc.slice(from, to, true)).dom.innerHTML;

  const pasteBetween = html => {
    const editor = createEditor('xy', true);
    editor.commands.setTextSelection(1);
    editor.view.pasteHTML(html, pasteEvent());
    return editor.getText();
  };

  afterEach(() => {
    editors.forEach(editor => editor.destroy());
    editors = [];
  });

  // Chromium on Windows wraps copied HTML in line-broken markup.
  it('drops the Windows clipboard wrapper of a marked copy around a pasted phrase', () => {
    const html =
      '<html>\r\n<body>\r\n<!--StartFragment--><meta charset="utf-8"><span data-pm-slice="0 0 []">hello</span><!--EndFragment-->\r\n</body>\r\n</html>';

    expect(pasteBetween(html)).toBe('xhelloy');
  });

  it('joins copied paragraphs with one space', () => {
    const html = copy(createEditor('<p>one</p><p></p><p>two</p>', false), 1, 11);

    expect(pasteBetween(html)).toBe('xone twoy');
  });

  it.each([
    ['paragraphs around', 1, 'xa by'],
    ['a paragraph after', 3, 'xby'],
  ])('drops a copied horizontal rule with %s it', (_, from, expected) => {
    const source = createEditor('<p>a</p><hr><p>b</p>', false);
    const html = copy(source, from, source.state.doc.content.size - 1);

    expect(pasteBetween(html)).toBe(expected);
  });

  // Chromium on macOS and Linux prefixes copied HTML with a meta tag.
  it.each([
    ['a charset', '<meta charset="utf-8">'],
    ['a content-type', '<meta http-equiv="content-type" content="text/html; charset=utf-8">'],
  ])('joins copied paragraphs prefixed with %s meta tag with one space', (_, meta) => {
    const html = copy(createEditor('<p>one</p><p>two</p>', false), 1, 9);

    expect(pasteBetween(meta + html)).toBe('xone twoy');
  });

  it("flattens a copied code block's lines as stored content does", () => {
    const source = createEditor('<p>intro</p><pre><code>if x:\n    y()</code></pre>', false);
    const html = copy(source, 1, source.state.doc.content.size - 1);
    const editor = createEditor('', true);
    editor.view.pasteHTML(html, pasteEvent());

    expect(editor.getHTML()).toBe('intro <code>if x: y()</code>');
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
