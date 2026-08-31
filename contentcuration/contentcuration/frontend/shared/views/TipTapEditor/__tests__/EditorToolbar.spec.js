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
async function renderToolbar(editorOptions) {
  const user = userEvent.setup();
  const { container } = render(EditorToolbar, {
    provide: { editor: ref(makeEditorStub(editorOptions)) },
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
