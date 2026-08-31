import { render, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import MobileTopBar from '../TipTapEditor/components/toolbar/MobileTopBar.vue';
import { tabIn } from 'shared/utils/testing';

function makeEditorStub() {
  return {
    isActive: () => false,
    can: () => ({ undo: () => false, redo: () => false }),
  };
}

describe('MobileTopBar roving tabindex', () => {
  it('is a single tab stop, held by the unavailable undo control', async () => {
    const user = userEvent.setup();
    const { container } = render(MobileTopBar, {
      provide: { editor: ref(makeEditorStub()) },
      router: new VueRouter(),
    });
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
