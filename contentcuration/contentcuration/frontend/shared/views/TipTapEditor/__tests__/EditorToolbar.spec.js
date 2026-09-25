import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref, nextTick } from 'vue';
import VueRouter from 'vue-router';
import EditorToolbar from '../TipTapEditor/components/EditorToolbar.vue';
import { getTipTapEditorStrings } from '../TipTapEditor/TipTapEditorStrings';
import { tabIn } from 'shared/utils/testing';

const { textFormatOptions$ } = getTipTapEditorStrings();

// Every editor read the toolbar makes while rendering: undo/redo availability,
// mark state, the alignment probe in `getEffectiveAlignment`, and the
// transaction listener in `useDropdowns`.
function makeEditorStub({ canUndo = true, canRedo = false } = {}) {
  return {
    isActive: () => false,
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
async function renderToolbar(editorOptions, { insertActions = [] } = {}) {
  const user = userEvent.setup();
  const editor = makeEditorStub(editorOptions);
  const { container } = render(EditorToolbar, {
    provide: {
      editor: ref(editor),
      insertActions: ref(insertActions),
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
  return { user, container, controls: within(container).getAllByRole('button') };
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
  const inline = { name: 'inline', title: 'Insert inline', icon: 'x.svg', handler: jest.fn() };

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
