import { render, screen } from '@testing-library/vue';
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
