import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import VueRouter from 'vue-router';
import { useRovingTabIndex } from '../TipTapEditor/composables/useRovingTabIndex';

// The menu is nested inside `three` rather than being a sibling: nesting is the
// only arrangement that reaches the `[role="menu"]` guard, since a sibling menu
// is already excluded by the item lookup.
const Harness = {
  template: `
    <div ref="toolbar">
      <button data-toolbar-item data-testid="one">one</button>
      <button data-toolbar-item data-testid="two" aria-disabled="true">two</button>
      <button data-toolbar-item data-testid="three">
        three
        <span role="menu"><span role="menuitem" tabindex="-1" data-testid="menu-item">m</span></span>
      </button>
      <button v-if="extra" data-toolbar-item data-testid="four">four</button>
      <button data-testid="add" @click="extra = true">add</button>
    </div>
  `,
  setup() {
    const toolbar = ref(null);
    const extra = ref(false);
    useRovingTabIndex(toolbar);
    return { toolbar, extra };
  },
};

// The single tab stop and plain arrow movement are covered against the real
// toolbars in EditorToolbar.spec.js; this file covers what those cannot reach.
describe('useRovingTabIndex', () => {
  let user, one, two, three, unmount;

  beforeEach(() => {
    user = userEvent.setup();
    ({ unmount } = render(Harness, { router: new VueRouter() }));
    one = screen.getByTestId('one');
    two = screen.getByTestId('two');
    three = screen.getByTestId('three');
  });

  afterEach(() => {
    delete window.isRTL;
  });

  it('wraps to the first item on ArrowRight from the last item', async () => {
    three.focus();

    await user.keyboard('{ArrowRight}');

    expect(one).toHaveFocus();
  });

  it('skips controls KListWithOverflow has hidden', async () => {
    two.style.visibility = 'hidden';
    one.focus();

    await user.keyboard('{ArrowRight}');

    expect(three).toHaveFocus();
  });

  it('reverses the arrow directions in RTL', async () => {
    window.isRTL = true;
    two.focus();

    await user.keyboard('{ArrowRight}');
    expect(one).toHaveFocus();

    two.focus();
    await user.keyboard('{ArrowLeft}');
    expect(three).toHaveFocus();
  });

  it('returns the tab stop to the item that last had focus', async () => {
    three.focus();

    await user.tab();
    await user.tab({ shift: true });

    expect(three).toHaveFocus();
  });

  it('leaves focus and the tab stop alone for other keys', async () => {
    one.focus();

    await user.keyboard('{Enter}');

    expect(one).toHaveFocus();
    expect(one).toHaveAttribute('tabindex', '0');
    expect(two).toHaveAttribute('tabindex', '-1');
    expect(three).toHaveAttribute('tabindex', '-1');
  });

  it('gives an item added after mount a tabindex', async () => {
    await user.click(screen.getByTestId('add'));

    await waitFor(() => expect(screen.getByTestId('four')).toHaveAttribute('tabindex', '-1'));
  });

  it('stops handling arrow keys once unmounted', () => {
    unmount();

    // Dispatched by hand rather than through `userEvent`: the items are detached
    // from the document once unmounted, so nothing can focus them to type into.
    one.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(one).toHaveAttribute('tabindex', '0');
    expect(two).toHaveAttribute('tabindex', '-1');
  });

  it('ignores arrow keys raised from inside an open menu', async () => {
    three.focus();
    screen.getByTestId('menu-item').focus();

    await user.keyboard('{ArrowRight}');

    expect(three).toHaveAttribute('tabindex', '0');
    expect(one).toHaveAttribute('tabindex', '-1');
  });
});
