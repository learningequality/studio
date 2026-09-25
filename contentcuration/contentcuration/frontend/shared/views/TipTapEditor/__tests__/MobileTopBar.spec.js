import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import MobileTopBar from '../TipTapEditor/components/toolbar/MobileTopBar.vue';
import TipTapEditor from '../TipTapEditor/TipTapEditor.vue';
import { getTipTapEditorStrings } from '../TipTapEditor/TipTapEditorStrings';
import { stubProseMirrorLayout, tabIn } from 'shared/utils/testing';

// The top bar only renders in the touch-device layout. `isTouchDevice` reads
// `window` once as it loads, and a module factory is the only hook that runs at
// that moment — hence the mock that mocks nothing.
jest.mock('shared/utils/browserInfo.js', () => {
  global.window.ontouchstart = null;
  return jest.requireActual('shared/utils/browserInfo.js');
});

const { insertContentMenu$, insertImage$ } = getTipTapEditorStrings();

function makeEditorStub() {
  return {
    isActive: () => false,
    can: () => ({ undo: () => false, redo: () => false }),
  };
}

const insertContext = {
  editor: makeEditorStub(),
  selection: { empty: true, spansLines: false, hasCursor: true },
  canInsertNode: () => true,
};

function renderTopBar({ insertActions = [] } = {}) {
  return render(MobileTopBar, {
    provide: {
      editor: ref(insertContext.editor),
      insertActions: ref(insertActions),
      insertContext: ref(insertContext),
    },
    router: new VueRouter(),
  });
}

async function openInsertMenu(user) {
  screen.getByRole('button', { name: insertContentMenu$() }).focus();
  await user.keyboard('{Enter}');
  return screen.findByRole('menu');
}

describe('MobileTopBar roving tabindex', () => {
  it('is a single tab stop, held by the unavailable undo control', async () => {
    const user = userEvent.setup();
    const { container } = renderTopBar();
    const controls = within(container).getAllByRole('button');
    expect(controls.length).toBeGreaterThan(1);

    await tabIn(user);
    expect(controls[0]).toHaveFocus();
    expect(controls[0]).toHaveAttribute('aria-disabled', 'true');

    // Out again in one press: an unmarked control would be a second tab stop.
    await user.tab({ shift: true });
    expect(container).not.toContainElement(document.activeElement);
  });
});

describe('MobileTopBar insert menu', () => {
  it('opens from the keyboard and takes focus', async () => {
    const user = userEvent.setup();
    renderTopBar();

    const menu = await openInsertMenu(user);

    expect(within(menu).getByText(insertImage$())).toBeInTheDocument();
    expect(menu).toContainElement(document.activeElement);
  });
});

describe('MobileTopBar contributed insert actions', () => {
  const makeAction = overrides => ({
    name: 'inline',
    title: 'Insert inline',
    icon: 'x.svg',
    handler: jest.fn(),
    ...overrides,
  });

  it('lists every contributed action, prominent or not', async () => {
    const user = userEvent.setup();
    renderTopBar({
      insertActions: [
        makeAction(),
        makeAction({ name: 'prominent', title: 'Insert prominent', prominent: true }),
      ],
    });

    const menu = await openInsertMenu(user);

    expect(within(menu).getByText('Insert inline')).toBeInTheDocument();
    expect(within(menu).getByText('Insert prominent')).toBeInTheDocument();
  });

  it('runs an available action and not an unavailable one', async () => {
    const user = userEvent.setup();
    const inline = makeAction();
    const blocked = makeAction({
      name: 'blocked',
      title: 'Insert blocked',
      isAvailable: () => false,
    });
    renderTopBar({ insertActions: [inline, blocked] });

    const menu = await openInsertMenu(user);

    await user.click(within(menu).getByText('Insert blocked'));
    expect(blocked.handler).not.toHaveBeenCalled();

    await user.click(within(menu).getByText('Insert inline'));
    expect(inline.handler).toHaveBeenCalledTimes(1);
    expect(inline.handler).toHaveBeenCalledWith(insertContext);
  });

  describe('in the editor', () => {
    beforeAll(stubProseMirrorLayout);

    async function renderEditor() {
      const user = userEvent.setup();
      const inline = makeAction();
      const { container } = render(TipTapEditor, {
        props: { value: '<p>hello</p>', mode: 'edit', format: 'html', insertActions: [inline] },
        router: new VueRouter(),
      });
      await waitFor(() => expect(container.querySelector('.ProseMirror')).not.toBeNull());
      return { user, inline, container };
    }

    async function selectFromMenu(user) {
      await user.click(within(await openInsertMenu(user)).getByText('Insert inline'));
    }

    it('reports no cursor when the author never placed one', async () => {
      const { user, inline } = await renderEditor();

      await selectFromMenu(user);

      expect(inline.handler).toHaveBeenCalledTimes(1);
      expect(inline.handler.mock.calls[0][0].selection.hasCursor).toBe(false);
    });

    it('reports a cursor once the author placed one, although the menu took focus', async () => {
      const { user, inline, container } = await renderEditor();
      container.querySelector('.ProseMirror').focus();

      await selectFromMenu(user);

      expect(inline.handler).toHaveBeenCalledTimes(1);
      expect(inline.handler.mock.calls[0][0].selection.hasCursor).toBe(true);
    });
  });
});
