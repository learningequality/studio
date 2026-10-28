import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref, nextTick } from 'vue';
import VueRouter from 'vue-router';
import { Extension } from '@tiptap/core';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import EditorToolbar from '../TipTapEditor/components/EditorToolbar.vue';
import { getTipTapEditorStrings } from '../TipTapEditor/TipTapEditorStrings';
import { useEditor } from '../TipTapEditor/composables/useEditor';
import { stubProseMirrorLayout, tabIn } from 'shared/utils/testing';

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const windowIsSmall = require('vue').ref(false);
  return {
    __esModule: true,
    default: () => ({ windowIsSmall }),
  };
});

const {
  textFormatOptions$,
  alignRight$,
  bold$,
  italic$,
  underline$,
  strikethrough$,
  subscript$,
  superscript$,
  mathFormula$,
  bulletList$,
  numberedList$,
  insertImage$,
  codeBlock$,
  paste$,
  pasteOptionsMenu$,
  pasteWithoutFormatting$,
  formatHeader1$,
  formatHeader2$,
} = getTipTapEditorStrings();

// Every editor read the toolbar makes while rendering: undo/redo availability,
// mark state, the alignment probe in `getEffectiveAlignment`, and the
// transaction listener in `FormatDropdown`. `commands` records the chained
// commands that run.
function makeEditorStub({ canUndo = true, canRedo = false, isActive = () => false } = {}) {
  const commands = [];
  const chain = new Proxy(
    {},
    {
      get: (target, name) =>
        name === 'run'
          ? () => true
          : (...args) => {
              commands.push([name, ...args]);
              return chain;
            },
    },
  );
  return {
    commands,
    chain: () => chain,
    isActive,
    can: () => ({ undo: () => canUndo, redo: () => canRedo }),
    state: {
      selection: { from: 0, to: 0, empty: true },
      doc: { nodesBetween: () => {} },
    },
    view: { domAtPos: () => ({ node: document.createElement('div') }) },
    on: () => {},
    off: () => {},
  };
}

// In jsdom every control measures 0 wide, so KListWithOverflow restores them all
// and drops the more button — two ticks after the first render.
async function renderToolbar(editorOptions, { insertActions = [], inlineOnly = false } = {}) {
  const user = userEvent.setup();
  const editor = makeEditorStub(editorOptions);
  const { container } = render(EditorToolbar, {
    provide: {
      editor: ref(editor),
      insertActions: ref(insertActions),
      inlineOnly,
      insertContext: ref({
        editor,
        selection: { empty: true, spansLines: false, hasCursor: true },
        canInsertNode: () => true,
      }),
    },
    router: new VueRouter(),
  });
  await nextTick();
  await nextTick();
  // Every button, not only the `data-toolbar-item` ones: an unmarked control
  // would be a second tab stop.
  return { user, editor, container, controls: within(container).getAllByRole('button') };
}

describe('EditorToolbar roving tabindex', () => {
  it('is a single tab stop, on the first control', async () => {
    const { user, container, controls } = await renderToolbar();
    expect(controls.length).toBeGreaterThan(1);

    await tabIn(user);
    expect(controls[0]).toHaveFocus();

    await user.tab({ shift: true });
    expect(container).not.toContainElement(document.activeElement);
  });

  it('moves focus to the next control on ArrowRight', async () => {
    const { user, controls } = await renderToolbar();
    controls[0].focus();

    await user.keyboard('{ArrowRight}');

    expect(controls[1]).toHaveFocus();
  });

  it('wraps from the first control to the last on ArrowLeft', async () => {
    const { user, controls } = await renderToolbar();
    controls[0].focus();

    await user.keyboard('{ArrowLeft}');

    expect(controls[controls.length - 1]).toHaveFocus();
  });

  it('arrows on and off the format dropdown trigger like any other control', async () => {
    const { user, controls } = await renderToolbar();
    const index = controls.indexOf(screen.getByRole('button', { name: textFormatOptions$() }));
    controls[index - 1].focus();

    await user.keyboard('{ArrowRight}');
    expect(controls[index]).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(controls[index + 1]).toHaveFocus();
  });

  it.each(['{Enter}', ' '])('opens the format dropdown with %p', async key => {
    const { user } = await renderToolbar();
    screen.getByRole('button', { name: textFormatOptions$() }).focus();

    await user.keyboard(key);

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('keeps the tab stop on an unavailable control', async () => {
    const { user, controls } = await renderToolbar({ canUndo: false });

    await tabIn(user);

    expect(controls[0]).toHaveAttribute('aria-disabled', 'true');
    expect(controls[0]).toHaveFocus();
  });
});

describe('EditorToolbar contributed insert actions', () => {
  const inline = { name: 'inline', title: 'Insert inline', icon: 'add', handler: jest.fn() };

  it('stays a single tab stop with a contributed control', async () => {
    const { user, container, controls } = await renderToolbar({}, { insertActions: [inline] });
    expect(controls).toContain(screen.getByRole('button', { name: 'Insert inline' }));

    await tabIn(user);
    expect(controls[0]).toHaveFocus();

    await user.tab();
    expect(container).not.toContainElement(document.activeElement);
  });

  const prominent = {
    ...inline,
    name: 'prominent',
    title: 'Insert prominent',
    prominent: true,
    handler: jest.fn(),
  };

  it.each([inline, prominent])('arrows onto and off a contributed control: $name', async action => {
    const { user, controls } = await renderToolbar({}, { insertActions: [inline, prominent] });
    const index = controls.indexOf(screen.getByRole('button', { name: action.title }));
    controls[index - 1].focus();

    await user.keyboard('{ArrowRight}');
    expect(controls[index]).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(controls[index + 1]).toHaveFocus();
  });

  it('keeps the tab stop on an unavailable contributed control', async () => {
    const { user, controls } = await renderToolbar(
      {},
      { insertActions: [{ ...inline, isAvailable: () => false }] },
    );
    const button = screen.getByRole('button', { name: 'Insert inline' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    controls[controls.indexOf(button) - 1].focus();
    await user.keyboard('{ArrowRight}');
    expect(button).toHaveFocus();

    await user.tab({ shift: true });
    await tabIn(user);

    expect(button).toHaveFocus();
  });

  it('shows a prominent action labelled, immediately before minimize', async () => {
    const { controls } = await renderToolbar({}, { insertActions: [inline, prominent] });
    const prominentButton = screen.getByRole('button', { name: 'Insert prominent' });

    expect(prominentButton).toHaveTextContent('Insert prominent');
    expect(screen.getByRole('button', { name: 'Insert inline' })).not.toHaveTextContent(
      'Insert inline',
    );
    expect(controls.at(-2)).toBe(prominentButton);
    expect(controls.at(-1)).toBe(screen.getByRole('button', { name: 'Minimize Toolbar' }));
  });

  describe('in a small window', () => {
    const { windowIsSmall } = useKResponsiveWindow();
    beforeEach(() => {
      windowIsSmall.value = true;
    });
    afterEach(() => {
      windowIsSmall.value = false;
    });

    it('shows a prominent action as an icon button, still named', async () => {
      const action = { ...prominent, handler: jest.fn() };
      const { user } = await renderToolbar({}, { insertActions: [action] });
      const prominentButton = screen.getByRole('button', { name: 'Insert prominent' });

      expect(prominentButton).not.toHaveTextContent('Insert prominent');
      expect(prominentButton.querySelector('svg')).toBeInTheDocument();

      await user.click(prominentButton);
      expect(action.handler).toHaveBeenCalledTimes(1);
    });
  });

  it.each([inline, prominent])("shows a contributed action's KDS icon: $name", async action => {
    await renderToolbar({}, { insertActions: [action] });

    const button = screen.getByRole('button', { name: action.title });
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.querySelector('img')).toBeNull();
  });

  it.each([false, null])(
    'agrees across controls when isAvailable returns %p',
    async availability => {
      const plain = { ...inline, handler: jest.fn(), isAvailable: () => availability };
      const loud = { ...prominent, handler: jest.fn(), isAvailable: () => availability };
      const { user } = await renderToolbar({}, { insertActions: [plain, loud] });

      for (const action of [plain, loud]) {
        const button = screen.getByRole('button', { name: action.title });
        expect(button).toHaveAttribute('aria-disabled', 'true');
        await user.click(button);
        expect(action.handler).not.toHaveBeenCalled();
      }
    },
  );

  it('keeps an unavailable prominent action focusable, and does not run it', async () => {
    const blocked = { ...prominent, handler: jest.fn(), isAvailable: () => false };
    const { user, controls } = await renderToolbar({}, { insertActions: [blocked] });
    const button = screen.getByRole('button', { name: blocked.title });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeEnabled();
    controls[controls.indexOf(button) - 1].focus();

    await user.keyboard('{ArrowRight}');
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    await user.click(button);
    expect(blocked.handler).not.toHaveBeenCalled();
  });

  it("runs the prominent action's handler", async () => {
    const { user } = await renderToolbar({}, { insertActions: [prominent] });

    await user.click(screen.getByRole('button', { name: 'Insert prominent' }));

    expect(prominent.handler).toHaveBeenCalledTimes(1);
    expect(prominent.handler.mock.calls[0][0].selection).toEqual({
      empty: true,
      spansLines: false,
      hasCursor: true,
    });
  });
});

describe('EditorToolbar alignment control', () => {
  // The action itself was always defined; what changed is that the toolbar no longer
  // hides it, so the assertion has to be on what renders.
  it('renders the alignment control', async () => {
    await renderToolbar();

    expect(screen.getByRole('button', { name: alignRight$() })).toBeInTheDocument();
  });
});

describe('EditorToolbar in an inline-only editor', () => {
  const INLINE_TOOLS = [
    bold$(),
    italic$(),
    underline$(),
    strikethrough$(),
    subscript$(),
    superscript$(),
    mathFormula$(),
  ];
  const BLOCK_TOOLS = [
    textFormatOptions$(),
    bulletList$(),
    numberedList$(),
    alignRight$(),
    insertImage$(),
    codeBlock$(),
  ];

  it('offers the inline tools', async () => {
    await renderToolbar({}, { inlineOnly: true });

    for (const name of INLINE_TOOLS) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('leaves out every block tool', async () => {
    await renderToolbar({}, { inlineOnly: true });

    for (const name of BLOCK_TOOLS) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('renders no empty group', async () => {
    const { container } = await renderToolbar({}, { inlineOnly: true });

    for (const group of within(container).getAllByRole('group')) {
      expect(within(group).queryAllByRole('button')).not.toEqual([]);
    }
  });

  it('keeps the block tools in an editor that is not inline-only', async () => {
    await renderToolbar();

    for (const name of BLOCK_TOOLS) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });
});

describe('EditorToolbar paste', () => {
  stubProseMirrorLayout();

  // jsdom has none; ProseMirror's `pasteHTML` and `pasteText` construct one.
  beforeAll(() => {
    global.ClipboardEvent = class ClipboardEvent extends Event {};
  });

  afterAll(() => {
    delete global.ClipboardEvent;
  });

  // After `userEvent.setup()`, which installs its own clipboard; jsdom's Blob has no `text()`.
  const setClipboard = (type, data) => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: async () => [{ types: [type], getType: async () => ({ text: async () => data }) }],
        readText: async () => data,
      },
    });
  };

  const renderWithClipboard = (type, data, { inlineOnly = true, extensions = [] } = {}) => {
    const user = userEvent.setup();
    setClipboard(type, data);
    const { initializeEditor, editor } = useEditor();
    initializeEditor('', 'edit', { inlineOnly, extensions });
    const { unmount } = render(EditorToolbar, {
      provide: { editor, inlineOnly, insertActions: ref([]), insertContext: ref(null) },
      router: new VueRouter(),
    });
    // The toolbar reads the editor as it re-renders, so it goes first.
    teardown = () => {
      unmount();
      editor.value.destroy();
    };
    return { user, editor: editor.value };
  };

  let teardown;
  afterEach(() => teardown());

  const pasteFromToolbar = async (type, data, editorOptions) => {
    const { user, editor } = renderWithClipboard(type, data, editorOptions);
    await user.click(await screen.findByRole('button', { name: paste$() }));
    return editor;
  };

  const pasteWithoutFormattingFromToolbar = async (text, editorOptions) => {
    const { user, editor } = renderWithClipboard('text/plain', text, editorOptions);
    await user.click(await screen.findByRole('button', { name: pasteOptionsMenu$() }));
    await user.click(within(screen.getByRole('menu')).getByText(pasteWithoutFormatting$()));
    return editor;
  };

  describe('in an editor that is not inline-only', () => {
    const fullEditor = { inlineOnly: false };

    it('applies extensions’ paste transforms to pasted HTML', async () => {
      const ReplacePastedHTML = Extension.create({
        name: 'replacePastedHTML',
        transformPastedHTML: () => '<p>replaced</p>',
      });
      const editor = await pasteFromToolbar('text/html', '<p>a</p>', {
        ...fullEditor,
        extensions: [ReplacePastedHTML],
      });

      await waitFor(() => expect(editor.getHTML()).toBe('<p>replaced</p>'));
    });

    it('pastes each line of plain text as a paragraph', async () => {
      const editor = await pasteFromToolbar('text/plain', 'a\nb', fullEditor);

      await waitFor(() => expect(editor.getHTML()).toBe('<p>a</p><p>b</p>'));
    });

    it('keeps markup in text pasted without formatting as text', async () => {
      const editor = await pasteWithoutFormattingFromToolbar('<b>a</b>', fullEditor);

      await waitFor(() => expect(editor.getHTML()).toBe('<p>&lt;b&gt;a&lt;/b&gt;</p>'));
    });
  });

  it('inserts pasted blocks as one inline run', async () => {
    const editor = await pasteFromToolbar('text/html', '<h1>a</h1><ul><li>b</li></ul>');

    await waitFor(() => expect(editor.getHTML()).toBe('a b'));
  });

  it('inserts a pasted phrase as text', async () => {
    const editor = await pasteFromToolbar('text/html', '<span>a</span> b');

    await waitFor(() => expect(editor.getHTML()).toBe('a b'));
  });

  it('joins the lines of pasted plain text with a space', async () => {
    const editor = await pasteFromToolbar('text/plain', 'a\nb');

    await waitFor(() => expect(editor.getHTML()).toBe('a b'));
  });

  it('joins the lines of text pasted without formatting with a space', async () => {
    const editor = await pasteWithoutFormattingFromToolbar('a\r\nb');

    await waitFor(() => expect(editor.getHTML()).toBe('a b'));
  });
});

describe('EditorToolbar dropdown menus', () => {
  // A menu rendered inside the toolbar is clipped by any ancestor that hides its overflow.
  it.each([
    ['format', textFormatOptions$],
    ['paste', pasteOptionsMenu$],
  ])('opens the %s menu outside the toolbar', async (name, label) => {
    const { user, container } = await renderToolbar();

    await user.click(screen.getByRole('button', { name: label() }));

    expect(screen.getByRole('menu')).toBeVisible();
    expect(container).not.toContainElement(screen.getByRole('menu'));
  });

  it('shows the format at the cursor on its trigger', async () => {
    await renderToolbar({
      isActive: (name, attrs) => name === 'heading' && attrs?.level === 2,
    });

    expect(screen.getByRole('button', { name: textFormatOptions$() })).toHaveTextContent(
      formatHeader2$(),
    );
  });

  it('applies the chosen format', async () => {
    const { user, editor } = await renderToolbar();
    await user.click(screen.getByRole('button', { name: textFormatOptions$() }));

    await user.click(within(screen.getByRole('menu')).getByText(formatHeader1$()));

    expect(editor.commands).toContainEqual(['toggleHeading', { level: 1 }]);
  });
});
