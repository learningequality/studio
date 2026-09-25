import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, h, inject, nextTick } from 'vue';
import VueRouter from 'vue-router';
import { Node } from '@tiptap/core';
import { NodeViewWrapper, VueNodeViewRenderer } from '@tiptap/vue-2';
import TipTapEditor from '../TipTapEditor/TipTapEditor.vue';
import { getTipTapEditorStrings } from '../TipTapEditor/TipTapEditorStrings';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

const { insertTools$, moreButtonText$ } = getTipTapEditorStrings();

function makeEditorStub({ markdownOut, htmlOut }) {
  return {
    storage: {
      markdown: { getMarkdown: () => markdownOut },
    },
    getHTML: () => htmlOut,
  };
}

function getContent(editor, isReady, format) {
  if (!editor || !isReady) return '';
  if (format === 'html') return editor.getHTML();
  if (!editor.storage?.markdown) return '';
  return editor.storage.markdown.getMarkdown();
}
describe('TipTapEditor — format prop declaration', () => {
  const { format: formatProp } = TipTapEditor.props;

  it('exists on the component', () => {
    expect(formatProp).toBeDefined();
  });

  it('defaults to markdown', () => {
    expect(formatProp.default).toBe('markdown');
  });

  it('validator accepts markdown', () => {
    expect(formatProp.validator('markdown')).toBe(true);
  });

  it('validator accepts html', () => {
    expect(formatProp.validator('html')).toBe(true);
  });

  it('validator rejects anything else', () => {
    expect(formatProp.validator('xml')).toBe(false);
    expect(formatProp.validator('')).toBe(false);
    expect(formatProp.validator('JSON')).toBe(false);
  });
});

describe('TipTapEditor — getContent() logic', () => {
  const MARKDOWN = '**bold**';
  const HTML = '<p><strong>bold</strong></p>';

  describe('when editor is not ready', () => {
    it('returns empty string when editor is null', () => {
      expect(getContent(null, true, 'markdown')).toBe('');
    });

    it('returns empty string when isReady is false', () => {
      const editor = makeEditorStub({ markdownOut: MARKDOWN, htmlOut: HTML });
      expect(getContent(editor, false, 'markdown')).toBe('');
    });
  });

  describe('format="markdown" (default)', () => {
    it('returns markdown from storage', () => {
      const editor = makeEditorStub({ markdownOut: MARKDOWN, htmlOut: HTML });
      expect(getContent(editor, true, 'markdown')).toBe(MARKDOWN);
    });

    it('returns empty string when markdown storage is absent', () => {
      const editor = { storage: {}, getHTML: () => HTML };
      expect(getContent(editor, true, 'markdown')).toBe('');
    });
  });

  describe('format="html"', () => {
    it('returns HTML from editor.getHTML()', () => {
      const editor = makeEditorStub({ markdownOut: MARKDOWN, htmlOut: HTML });
      expect(getContent(editor, true, 'html')).toBe(HTML);
    });

    it('does not call getMarkdown() in html mode', () => {
      const getMarkdown = jest.fn(() => MARKDOWN);
      const editor = { storage: { markdown: { getMarkdown } }, getHTML: () => HTML };
      getContent(editor, true, 'html');
      expect(getMarkdown).not.toHaveBeenCalled();
    });

    it('works even when markdown storage is absent', () => {
      const editor = { storage: {}, getHTML: () => HTML };
      expect(getContent(editor, true, 'html')).toBe(HTML);
    });
  });
});

describe('TipTapEditor — minimizing from the toolbar', () => {
  const renderEditor = async listeners => {
    let editor;
    render(
      {
        components: { TipTapEditor },
        template:
          '<TipTapEditor value="<p>before</p>" mode="edit" format="html" v-on="$listeners" />',
        mounted() {
          editor = this.$children[0];
        },
      },
      { listeners, routes: new VueRouter() },
    );
    // The toolbar treats its buttons as unavailable until the editor reports ready,
    // which it does a tick after it is constructed.
    await new Promise(resolve => setTimeout(resolve, 0));
    await nextTick();
    return editor;
  };

  const minimize = user => user.click(screen.getByRole('button', { name: 'Minimize Toolbar' }));

  it('emits the content written since the last blur, before it emits minimize', async () => {
    const user = userEvent.setup();
    const update = jest.fn();
    const onMinimize = jest.fn();
    const editor = await renderEditor({ update, minimize: onMinimize });
    editor.editor.commands.setContent('<p>after</p>');

    await minimize(user);

    expect(update).toHaveBeenCalledWith('<p>after</p>');
    expect(update.mock.invocationCallOrder.at(-1)).toBeLessThan(
      onMinimize.mock.invocationCallOrder[0],
    );
  });
});

describe('TipTapEditor — consumer extensions and ready', () => {
  beforeAll(stubProseMirrorLayout);

  const WidgetView = defineComponent({
    setup() {
      const label = inject('widgetLabel');
      return () => h(NodeViewWrapper, { props: { as: 'span' } }, [label]);
    },
  });

  const Widget = Node.create({
    name: 'widget',
    group: 'inline',
    inline: true,
    atom: true,
    parseHTML: () => [{ tag: 'span[data-widget]' }],
    renderHTML: () => ['span', { 'data-widget': '' }],
    addCommands() {
      return {
        insertWidget:
          () =>
          ({ commands }) =>
            commands.insertContent({ type: this.name }),
      };
    },
    addKeyboardShortcuts() {
      return { 'Mod-Alt-w': () => this.editor.commands.insertWidget() };
    },
    addNodeView() {
      return VueNodeViewRenderer(WidgetView);
    },
  });

  const countWidgets = editor => (editor.getHTML().match(/data-widget/g) || []).length;

  async function renderWithWidget() {
    const onReady = jest.fn();
    const { container } = render(
      {
        components: { TipTapEditor },
        provide: { widgetLabel: 'from the consumer' },
        data: () => ({ extensions: [Widget] }),
        methods: { onReady },
        template: `<TipTapEditor
          value="<p>a<span data-widget></span>b</p>"
          mode="edit"
          format="html"
          :extensions="extensions"
          @ready="onReady"
        />`,
      },
      { router: new VueRouter() },
    );
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    return { container, editor: onReady.mock.calls[0][0] };
  }

  it('registers a contributed extension, whose node type, command and shortcut all work', async () => {
    const user = userEvent.setup();
    const { container, editor } = await renderWithWidget();
    expect(countWidgets(editor)).toBe(1);

    editor.commands.insertWidget();
    expect(countWidgets(editor)).toBe(2);

    container.querySelector('.ProseMirror').focus();
    await user.keyboard('{Control>}{Alt>}w{/Alt}{/Control}');
    expect(countWidgets(editor)).toBe(3);
  });

  it('lets a contributed node view inject what an ancestor of the editor provides', async () => {
    const { container } = await renderWithWidget();
    await waitFor(() =>
      expect(container.querySelector('.ProseMirror')).toHaveTextContent('from the consumer'),
    );
  });

  it('emits ready once, with the editor it renders', async () => {
    const ready = jest.fn();
    const { container, updateProps } = render(TipTapEditor, {
      props: { value: '<p>a</p>', mode: 'edit', format: 'html' },
      listeners: { ready },
      router: new VueRouter(),
    });
    await waitFor(() => expect(ready).toHaveBeenCalled());
    expect(ready.mock.calls[0][0].view.dom).toBe(container.querySelector('.ProseMirror'));

    await updateProps({ mode: 'view' });
    await updateProps({ mode: 'edit' });

    expect(ready).toHaveBeenCalledTimes(1);
  });
});

describe('TipTapEditor — contributed insert actions', () => {
  beforeAll(stubProseMirrorLayout);

  const makeAction = overrides => ({
    name: 'widget',
    title: 'Insert widget',
    icon: 'widget.svg',
    handler: jest.fn(),
    ...overrides,
  });

  async function renderWithActions(insertActions) {
    const ready = jest.fn();
    const { container } = render(TipTapEditor, {
      props: {
        value: '<p>one two</p><p>three</p>',
        mode: 'edit',
        format: 'html',
        insertActions,
      },
      listeners: { ready },
      router: new VueRouter(),
    });
    await waitFor(() => expect(ready).toHaveBeenCalled());
    return { container, editor: ready.mock.calls[0][0] };
  }

  const insertGroupButton = name =>
    within(screen.getByRole('group', { name: insertTools$() })).getByRole('button', { name });

  it('evaluates its predicates against the selection as it moves', async () => {
    const { editor } = await renderWithActions([
      makeAction({
        isAvailable: ({ selection, canInsertNode }) =>
          !selection.spansLines && canInsertNode('math'),
        isActive: ({ editor }) => !editor.state.selection.empty,
      }),
    ]);
    const button = insertGroupButton('Insert widget');

    editor.commands.setTextSelection({ from: 3, to: 12 });
    await nextTick();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    editor.commands.setTextSelection({ from: 2, to: 5 });
    await nextTick();
    expect(button).toHaveAttribute('aria-disabled', 'false');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    editor.commands.setTextSelection(2);
    await nextTick();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('hands the handler the editor and the facts at click time', async () => {
    const user = userEvent.setup();
    const action = makeAction();
    const { editor } = await renderWithActions([action]);

    await user.click(insertGroupButton('Insert widget'));

    expect(action.handler).toHaveBeenCalledTimes(1);
    const context = action.handler.mock.calls[0][0];
    expect(context.editor).toBe(editor);
    expect(context.selection).toEqual({ empty: true, spansLines: false, hasCursor: false });
    expect(context.canInsertNode('math')).toBe(true);
  });

  describe('when the toolbar overflows', () => {
    // jsdom measures every item 0 wide, so KListWithOverflow never overflows.
    beforeEach(() => {
      jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 32,
        right: 100,
        width: 100,
        height: 32,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('runs from the More menu, knowing the author had placed a cursor', async () => {
      const user = userEvent.setup();
      const action = makeAction();
      const { container } = await renderWithActions([action]);
      container.querySelector('.ProseMirror').focus();

      // The More button takes focus from the editor.
      await user.click(screen.getByRole('button', { name: moreButtonText$() }));
      await user.click(within(await screen.findByRole('menu')).getByText('Insert widget'));

      expect(action.handler).toHaveBeenCalledTimes(1);
      expect(action.handler.mock.calls[0][0].selection.hasCursor).toBe(true);
    });

    it('keeps a prominent action out of the More menu', async () => {
      const user = userEvent.setup();
      await renderWithActions([
        makeAction(),
        makeAction({ name: 'prominent', title: 'Insert prominent', prominent: true }),
      ]);

      await user.click(screen.getByRole('button', { name: moreButtonText$() }));
      const menu = await screen.findByRole('menu');

      expect(within(menu).getByText('Insert widget')).toBeInTheDocument();
      expect(within(menu).queryByText('Insert prominent')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Insert prominent' })).toBeVisible();
    });
  });
});
