import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref, nextTick } from 'vue';
import VueRouter from 'vue-router';
import MobileFormattingBar from '../TipTapEditor/components/toolbar/MobileFormattingBar.vue';
import TipTapEditor from '../TipTapEditor/TipTapEditor.vue';
import { getTipTapEditorStrings } from '../TipTapEditor/TipTapEditorStrings';
import { stubProseMirrorLayout, tabIn } from 'shared/utils/testing';

// The bar only renders in the touch-device layout. `isTouchDevice` reads `window`
// once as it loads, and a module factory is the only hook that runs at that
// moment — hence the mock that mocks nothing.
jest.mock('shared/utils/browserInfo.js', () => {
  global.window.ontouchstart = null;
  return jest.requireActual('shared/utils/browserInfo.js');
});

const { decreaseFormatSize$, textFormattingToolbar$ } = getTipTapEditorStrings();

const formattingBar = () => screen.queryByRole('toolbar', { name: textFormattingToolbar$() });

// Every editor read the bar makes: the format level in `useFormatControls`, and
// the selection the mount hook scrolls into view.
function makeEditorStub({ smallText = false } = {}) {
  return {
    isActive: name => smallText && name === 'small',
    state: { selection: { from: 0, to: 0 } },
    view: { dom: document.createElement('div') },
  };
}

describe('MobileFormattingBar roving tabindex', () => {
  function renderBar() {
    return render(MobileFormattingBar, {
      provide: { editor: ref(makeEditorStub({ smallText: true })) },
      router: new VueRouter(),
    });
  }

  it('is a single tab stop, and keeps an unavailable format control in the order', async () => {
    const user = userEvent.setup();
    const { container } = renderBar();
    const controls = within(container).getAllByRole('button');
    const decrease = screen.getByRole('button', { name: decreaseFormatSize$() });
    expect(controls.length).toBeGreaterThan(1);
    expect(decrease).toHaveAttribute('aria-disabled', 'true');
    expect(decrease).toBeEnabled();

    await tabIn(user);
    expect(controls[0]).toHaveFocus();

    // Out again in one press: an unmarked control would be a second tab stop.
    await user.tab({ shift: true });
    expect(container).not.toContainElement(document.activeElement);
  });

  it('reaches the unavailable format control with the arrow keys', async () => {
    const user = userEvent.setup();
    const { container } = renderBar();
    within(container).getAllByRole('button')[0].focus();

    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('button', { name: decreaseFormatSize$() })).toHaveFocus();
  });
});

describe('MobileFormattingBar contributed insert actions', () => {
  const makeAction = overrides => ({
    name: 'inline',
    title: 'Insert inline',
    icon: 'x.svg',
    handler: jest.fn(),
    ...overrides,
  });
  const inline = makeAction();
  const prominent = makeAction({ name: 'prominent', title: 'Insert prominent', prominent: true });
  const blocked = makeAction({
    name: 'blocked',
    title: 'Insert blocked',
    isAvailable: () => false,
  });

  const insertContext = {
    editor: makeEditorStub(),
    selection: { empty: true, spansLines: false, hasCursor: true },
    canInsertNode: () => true,
  };

  function renderBar() {
    const { container } = render(MobileFormattingBar, {
      provide: {
        editor: ref(insertContext.editor),
        insertActions: ref([inline, prominent, blocked]),
        insertContext: ref(insertContext),
      },
      router: new VueRouter(),
    });
    return { user: userEvent.setup(), controls: within(container).getAllByRole('button') };
  }

  it('offers every contributed action, prominent or not', () => {
    renderBar();

    expect(screen.getByRole('button', { name: 'Insert inline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert prominent' })).toBeInTheDocument();
  });

  it('keeps an unavailable contributed control in the arrow order', async () => {
    const { user, controls } = renderBar();
    const button = screen.getByRole('button', { name: 'Insert blocked' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    controls[controls.indexOf(button) - 1].focus();

    await user.keyboard('{ArrowRight}');

    expect(button).toHaveFocus();
  });

  it("runs a contributed action's handler", async () => {
    const { user } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Insert inline' }));

    expect(inline.handler).toHaveBeenCalledTimes(1);
    expect(inline.handler).toHaveBeenCalledWith(insertContext);
  });
});

describe('MobileFormattingBar keyboard reachability', () => {
  beforeAll(stubProseMirrorLayout);

  async function renderMobileEditor() {
    const { container } = render(TipTapEditor, {
      props: { value: 'hello', mode: 'edit' },
      router: new VueRouter(),
    });
    await waitFor(() => expect(container.querySelector('.ProseMirror')).not.toBeNull());
    container.querySelector('.ProseMirror').focus();
    await waitFor(() => expect(formattingBar()).toBeInTheDocument());
    return container;
  }

  it('survives the re-render that blurring the content area schedules', async () => {
    const container = await renderMobileEditor();

    // A browser fires `blur` before `focusout`, and flushes microtasks in between,
    // so the bar has to outlive the re-render that `blur` alone schedules —
    // otherwise Tab is left with nothing to land on. jsdom's `.blur()` collapses
    // the two, so raise the event on its own.
    container
      .querySelector('.ProseMirror')
      .dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
    await nextTick();

    expect(formattingBar()).toBeInTheDocument();
  });

  it('takes the tab stop after the content area', async () => {
    const user = userEvent.setup({ delay: null });
    await renderMobileEditor();

    await user.tab();

    expect(formattingBar()).toContainElement(document.activeElement);
  });

  it('goes away once focus leaves the editor entirely', async () => {
    const user = userEvent.setup({ delay: null });
    await renderMobileEditor();
    document.body.appendChild(document.createElement('button'));

    await user.tab();
    await user.tab();
    await nextTick();

    expect(formattingBar()).not.toBeInTheDocument();
  });
});
