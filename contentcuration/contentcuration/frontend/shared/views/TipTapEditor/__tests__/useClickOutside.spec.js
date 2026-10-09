import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, nextTick, ref } from 'vue';
import VueRouter from 'vue-router';
import { useClickOutside } from '../TipTapEditor/composables/useClickOutside';

/**
 * Stands in for the editor: `isFocused` plays the editor content's focus, which the
 * tests move by hand, and the menu trigger marks itself open the way KDropdownMenu does. The
 * dialog trigger stands in for content, such as a node view, whose popup renders outside.
 */
function renderHarness({ editing = true } = {}) {
  const isFocused = ref(false);
  const syncContent = jest.fn();
  const close = jest.fn();
  const { updateProps, unmount } = render(
    defineComponent({
      setup(props) {
        const container = ref(null);
        useClickOutside({
          container,
          isFocused,
          isEditing: () => props.editing,
          syncContent,
          close,
        });
        // Used by the string template below, which the lint rule cannot read.
        // eslint-disable-next-line vue/no-unused-properties
        return { container };
      },
      props: {
        editing: { type: Boolean, default: true },
        // eslint-disable-next-line vue/no-unused-properties
        menuOpen: { type: Boolean, default: false },
        // eslint-disable-next-line vue/no-unused-properties
        dialogOpen: { type: Boolean, default: false },
      },
      template: `<div>
        <div ref="container">
          <button>Inside</button>
          <button aria-haspopup="menu" :aria-expanded="String(menuOpen)">Menu</button>
          <p><button aria-haspopup="dialog" :aria-expanded="String(dialogOpen)">Chip</button></p>
        </div>
        <button>Outside</button>
        <div @click.stop><button>Stopped</button></div>
      </div>`,
    }),
    { props: { editing }, routes: new VueRouter() },
  );

  const blur = async () => {
    isFocused.value = true;
    await nextTick();
    isFocused.value = false;
    await nextTick();
  };
  return { updateProps, unmount, syncContent, close, blur };
}

const button = name => screen.getByRole('button', { name });

describe('useClickOutside', () => {
  describe('closing on a click', () => {
    it('closes on a click outside, which syncs the content itself', async () => {
      const user = userEvent.setup();
      const { close, syncContent } = renderHarness();

      await user.click(button('Outside'));

      expect(close).toHaveBeenCalledTimes(1);
      expect(syncContent).not.toHaveBeenCalled();
    });

    it('closes on a click outside that is stopped before it reaches the document', async () => {
      const user = userEvent.setup();
      const { close } = renderHarness();

      await user.click(button('Stopped'));

      expect(close).toHaveBeenCalledTimes(1);
    });

    it('stays open on a click inside', async () => {
      const user = userEvent.setup();
      const { close } = renderHarness();

      await user.click(button('Inside'));

      expect(close).not.toHaveBeenCalled();
    });

    it('stays open on a click outside while one of its menus is open', async () => {
      const user = userEvent.setup();
      const { close, updateProps } = renderHarness();
      await updateProps({ menuOpen: true });

      await user.click(button('Outside'));

      expect(close).not.toHaveBeenCalled();
    });

    it('stays open on a click outside while a popup its content opened is open', async () => {
      const user = userEvent.setup();
      const { close, updateProps } = renderHarness();
      await updateProps({ dialogOpen: true });

      await user.click(button('Outside'));
      expect(close).not.toHaveBeenCalled();

      await updateProps({ dialogOpen: false });
      await user.click(button('Outside'));
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('does not listen while not open for editing', async () => {
      const user = userEvent.setup();
      const { close } = renderHarness({ editing: false });

      await user.click(button('Outside'));

      expect(close).not.toHaveBeenCalled();
    });

    it('stops listening once it leaves edit mode', async () => {
      const user = userEvent.setup();
      const { close, updateProps } = renderHarness();
      await updateProps({ editing: false });

      await user.click(button('Outside'));

      expect(close).not.toHaveBeenCalled();
    });
  });

  describe('syncing on blur', () => {
    it('syncs on a blur without a press', async () => {
      const { syncContent, blur } = renderHarness();

      await blur();

      expect(syncContent).toHaveBeenCalledTimes(1);
    });

    it('holds the sync of a blur during a press until its click', async () => {
      const user = userEvent.setup();
      const { syncContent, close, blur } = renderHarness();

      await user.pointer({ keys: '[MouseLeft>]', target: button('Inside') });
      await blur();
      expect(syncContent).not.toHaveBeenCalled();

      await user.pointer({ keys: '[/MouseLeft]', target: button('Inside') });

      expect(syncContent).toHaveBeenCalledTimes(1);
      expect(close).not.toHaveBeenCalled();
    });

    it('drops the held sync when the click closes, as closing syncs', async () => {
      const user = userEvent.setup();
      const { syncContent, close, blur } = renderHarness();

      await user.pointer({ keys: '[MouseLeft>]', target: button('Outside') });
      await blur();
      await user.pointer({ keys: '[/MouseLeft]', target: button('Outside') });
      await new Promise(resolve => setTimeout(resolve));

      expect(close).toHaveBeenCalledTimes(1);
      expect(syncContent).not.toHaveBeenCalled();
    });

    it('syncs a held blur after a press that ends without a click', async () => {
      const user = userEvent.setup();
      const { syncContent, blur } = renderHarness();

      await user.pointer({ keys: '[MouseLeft>]', target: button('Inside') });
      await blur();
      // A press that moves off its target and ends elsewhere, as when dragging.
      await user.pointer({ target: button('Outside') });
      document.dispatchEvent(new Event('pointercancel'));
      expect(syncContent).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve));

      expect(syncContent).toHaveBeenCalledTimes(1);
    });

    it('syncs a held blur when it leaves edit mode during the press', async () => {
      const user = userEvent.setup();
      const { syncContent, blur, updateProps } = renderHarness();
      await user.pointer({ keys: '[MouseLeft>]', target: button('Inside') });
      await blur();

      await updateProps({ editing: false });

      expect(syncContent).toHaveBeenCalledTimes(1);
    });

    it('syncs a held blur when it unmounts during the press', async () => {
      const user = userEvent.setup();
      const { syncContent, blur, unmount } = renderHarness();
      await user.pointer({ keys: '[MouseLeft>]', target: button('Inside') });
      await blur();

      unmount();

      expect(syncContent).toHaveBeenCalledTimes(1);
    });

    it('forgets a press when it leaves edit mode, so a later blur syncs at once', async () => {
      const user = userEvent.setup();
      const { syncContent, blur, updateProps } = renderHarness();
      await user.pointer({ keys: '[MouseLeft>]', target: button('Inside') });
      await updateProps({ editing: false });
      await user.pointer({ keys: '[/MouseLeft]', target: button('Inside') });
      await updateProps({ editing: true });

      await blur();

      expect(syncContent).toHaveBeenCalledTimes(1);
    });
  });
});
