import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import LinkBubbleMenu from '../TipTapEditor/components/link/LinkBubbleMenu.vue';
import { tabIn } from 'shared/utils/testing';

describe('LinkBubbleMenu roving tabindex', () => {
  it('is a single tab stop, on the link itself', async () => {
    const user = userEvent.setup();
    const { container } = render(LinkBubbleMenu, {
      props: { editor: { getAttributes: () => ({ href: 'https://example.com' }) } },
      provide: { linkHandler: { openLinkEditor: () => {}, removeLink: () => {} } },
      router: new VueRouter(),
    });
    // The link counts as a control here, so it has to take part in the roving
    // tabindex like the buttons around it.
    const controls = Array.from(container.querySelectorAll('a, button'));
    expect(controls.length).toBeGreaterThan(1);

    await tabIn(user);
    expect(controls[0]).toHaveFocus();

    // Out again in one press: an unmarked control would be a second tab stop.
    await user.tab({ shift: true });
    expect(container).not.toContainElement(document.activeElement);
  });
});
