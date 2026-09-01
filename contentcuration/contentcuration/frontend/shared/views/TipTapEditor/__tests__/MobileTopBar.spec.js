import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import MobileTopBar from '../TipTapEditor/components/toolbar/MobileTopBar.vue';
import { getTipTapEditorStrings } from '../TipTapEditor/TipTapEditorStrings';
import { tabIn } from 'shared/utils/testing';

const { insertContentMenu$, insertImage$ } = getTipTapEditorStrings();

function makeEditorStub() {
  return {
    isActive: () => false,
    can: () => ({ undo: () => false, redo: () => false }),
  };
}

function renderTopBar() {
  return render(MobileTopBar, {
    provide: { editor: ref(makeEditorStub()) },
    router: new VueRouter(),
  });
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
    screen.getByRole('button', { name: insertContentMenu$() }).focus();

    await user.keyboard('{Enter}');

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText(insertImage$())).toBeInTheDocument();
    expect(menu).toContainElement(document.activeElement);
  });
});
