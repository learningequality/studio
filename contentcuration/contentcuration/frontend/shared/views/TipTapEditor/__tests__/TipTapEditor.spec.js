import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import TipTapEditor from '../TipTapEditor/TipTapEditor.vue';

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
    const ready = jest.fn();
    render(
      {
        components: { TipTapEditor },
        template:
          '<TipTapEditor value="<p>before</p>" mode="edit" format="html" v-on="$listeners" />',
      },
      { listeners: { ...listeners, ready }, routes: new VueRouter() },
    );
    // The toolbar treats its buttons as unavailable until the editor reports ready.
    await waitFor(() => expect(ready).toHaveBeenCalled());
    await nextTick();
    return ready.mock.calls[0][0];
  };

  const minimize = user => user.click(screen.getByRole('button', { name: 'Minimize Toolbar' }));

  it('emits the content written since the last blur, before it emits minimize', async () => {
    const user = userEvent.setup();
    const update = jest.fn();
    const onMinimize = jest.fn();
    const editor = await renderEditor({ update, minimize: onMinimize });
    editor.commands.setContent('<p>after</p>');

    await minimize(user);

    expect(update).toHaveBeenCalledWith('<p>after</p>');
    expect(update.mock.invocationCallOrder.at(-1)).toBeLessThan(
      onMinimize.mock.invocationCallOrder[0],
    );
  });
});

describe('TipTapEditor — closing on a click outside', () => {
  const renderBeside = async (outside, listeners) => {
    const ready = jest.fn();
    render(
      {
        components: { TipTapEditor },
        template: `<div>
          <TipTapEditor value="<p>before</p>" mode="edit" format="html" v-on="$listeners" />
          ${outside}
        </div>`,
      },
      { listeners: { ...listeners, ready }, routes: new VueRouter() },
    );
    await waitFor(() => expect(ready).toHaveBeenCalled());
    await nextTick();
    return ready.mock.calls[0][0];
  };

  const outsideButton = () => screen.getByRole('button', { name: 'Outside' });

  it('minimizes on a click that is stopped before it reaches the document', async () => {
    // As a Vuetify dialog stops every click inside it.
    const user = userEvent.setup();
    const minimize = jest.fn();
    await renderBeside('<div @click.stop><button>Outside</button></div>', { minimize });

    await user.click(outsideButton());

    expect(minimize).toHaveBeenCalledTimes(1);
  });

  it('emits the content written since the last blur, before it emits minimize', async () => {
    const user = userEvent.setup();
    const update = jest.fn();
    const minimize = jest.fn();
    const editor = await renderBeside('<button>Outside</button>', { update, minimize });
    editor.view.dom.focus();
    await nextTick();
    editor.commands.setContent('<p>after</p>');

    await user.click(outsideButton());

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('<p>after</p>');
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(minimize.mock.invocationCallOrder[0]);
  });

  it('holds back the content a press blurs out of it until the press is released', async () => {
    // Emitted at mousedown, the content can re-render what is around the editor and
    // move the pressed target out from under the pointer before the click lands.
    const user = userEvent.setup();
    const update = jest.fn();
    const editor = await renderBeside('<button>Outside</button>', { update });
    editor.view.dom.focus();
    await nextTick();
    editor.commands.setContent('<p>after</p>');

    await user.pointer({ keys: '[MouseLeft>]', target: outsideButton() });
    await nextTick();

    expect(outsideButton()).toHaveFocus();
    expect(update).not.toHaveBeenCalled();

    await user.pointer({ keys: '[/MouseLeft]', target: outsideButton() });

    expect(update).toHaveBeenCalledWith('<p>after</p>');
  });

  it('emits the content it holds back when it unmounts before the press is released', async () => {
    // Only the editor unmounts. When its parent unmounts too, Vue has already stopped
    // the parent's watchers, so one relaying this update misses it.
    const user = userEvent.setup();
    const update = jest.fn();
    const ready = jest.fn();
    const { updateProps } = render(
      {
        components: { TipTapEditor },
        props: { shown: { type: Boolean, default: true } },
        template: `<div>
          <TipTapEditor v-if="shown" value="<p>before</p>" mode="edit" format="html" v-on="$listeners" />
          <button>Outside</button>
        </div>`,
      },
      { listeners: { update, ready }, routes: new VueRouter() },
    );
    await waitFor(() => expect(ready).toHaveBeenCalled());
    const editor = ready.mock.calls[0][0];
    editor.view.dom.focus();
    await nextTick();
    editor.commands.setContent('<p>after</p>');

    await user.pointer({ keys: '[MouseLeft>]', target: outsideButton() });
    await nextTick();
    expect(update).not.toHaveBeenCalled();

    await updateProps({ shown: false });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('<p>after</p>');
  });

  it('emits the content on a blur without a press, after a press has been released', async () => {
    const user = userEvent.setup();
    const update = jest.fn();
    const editor = await renderBeside('<button>Outside</button>', { update });
    await user.click(outsideButton());

    editor.view.dom.focus();
    await nextTick();
    editor.commands.setContent('<p>after</p>');
    outsideButton().focus();
    await nextTick();

    expect(update).toHaveBeenCalledWith('<p>after</p>');
  });

  describe('when it leaves edit mode before the press is released', () => {
    const renderWithMode = async update => {
      const ready = jest.fn();
      const view = render(
        {
          components: { TipTapEditor },
          props: { mode: { type: String, default: 'edit' } },
          template: `<div>
            <TipTapEditor value="<p>before</p>" :mode="mode" format="html" v-on="$listeners" />
            <button>Outside</button>
          </div>`,
        },
        { listeners: { update, ready }, routes: new VueRouter() },
      );
      await waitFor(() => expect(ready).toHaveBeenCalled());
      return { ...view, editor: ready.mock.calls[0][0] };
    };

    const editThenPressOutside = async (user, editor, content) => {
      editor.view.dom.focus();
      await nextTick();
      editor.commands.setContent(content);
      await user.pointer({ keys: '[MouseLeft>]', target: outsideButton() });
      await nextTick();
    };

    it('emits the content it holds back', async () => {
      const user = userEvent.setup();
      const update = jest.fn();
      const { editor, updateProps } = await renderWithMode(update);
      await editThenPressOutside(user, editor, '<p>after</p>');
      expect(update).not.toHaveBeenCalled();

      await updateProps({ mode: 'view' });

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith('<p>after</p>');
    });

    it('emits the content on its next blur without a press', async () => {
      const user = userEvent.setup();
      const update = jest.fn();
      const { editor, updateProps } = await renderWithMode(update);
      await editThenPressOutside(user, editor, '<p>after</p>');
      await updateProps({ mode: 'view' });
      await user.pointer({ keys: '[/MouseLeft]', target: outsideButton() });
      await updateProps({ mode: 'edit' });
      update.mockClear();

      editor.view.dom.focus();
      await nextTick();
      editor.commands.setContent('<p>later</p>');
      outsideButton().focus();
      await nextTick();

      expect(update).toHaveBeenCalledWith('<p>later</p>');
    });
  });

  it('emits the content on a blur without a press', async () => {
    const update = jest.fn();
    const editor = await renderBeside('<button>Outside</button>', { update });
    editor.view.dom.focus();
    await nextTick();
    editor.commands.setContent('<p>after</p>');

    outsideButton().focus();
    await nextTick();

    expect(update).toHaveBeenCalledWith('<p>after</p>');
  });

  it('does not minimize an editor that the click itself opens', async () => {
    const user = userEvent.setup();
    const minimize = jest.fn();
    const ready = jest.fn();
    render(
      {
        components: { TipTapEditor },
        data: () => ({ mode: 'view' }),
        template: `<div>
          <TipTapEditor value="<p>before</p>" :mode="mode" format="html" v-on="$listeners" />
          <div @click.stop><button @click="mode = 'edit'">Open</button></div>
        </div>`,
      },
      { listeners: { minimize, ready }, routes: new VueRouter() },
    );
    await waitFor(() => expect(ready).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(minimize).not.toHaveBeenCalled();
  });
});
