import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import ToolbarButton from '../TipTapEditor/components/toolbar/ToolbarButton.vue';
import { tabIn } from 'shared/utils/testing';

const TITLE = 'Strong';

function renderButton(props = {}) {
  const { emitted } = render(ToolbarButton, {
    props: { title: TITLE, icon: 'bold.svg', ...props },
    router: new VueRouter(),
  });
  return { button: screen.getByRole('button', { name: TITLE }), emitted };
}

describe('ToolbarButton', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    delete window.isRTL;
  });

  it('keeps an unavailable control focusable and marks it aria-disabled', async () => {
    const { button } = renderButton({ isAvailable: false });

    await tabIn(user);

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveFocus();
  });

  it('does not emit click when unavailable', async () => {
    const { button, emitted } = renderButton({ isAvailable: false });

    await user.click(button);

    expect(emitted().click).toBeUndefined();
  });

  it('emits click when available', async () => {
    const { button, emitted } = renderButton();

    expect(button).toHaveAttribute('aria-disabled', 'false');

    await user.click(button);

    expect(emitted().click).toHaveLength(1);
  });

  it('renders the RTL icon in RTL', () => {
    window.isRTL = true;
    renderButton({ rtlIcon: 'bold-rtl.svg' });

    expect(screen.getByRole('img', { name: TITLE })).toHaveAttribute('src', 'bold-rtl.svg');
  });

  it('renders the default icon in LTR', () => {
    renderButton({ rtlIcon: 'bold-rtl.svg' });

    expect(screen.getByRole('img', { name: TITLE })).toHaveAttribute('src', 'bold.svg');
  });

  it('does not flip the icon in LTR', () => {
    renderButton({ shouldFlipInRtl: true });

    expect(screen.getByRole('img', { name: TITLE })).not.toHaveClass('rtl-flip');
  });

  it('flips the icon in RTL when asked to', () => {
    window.isRTL = true;
    renderButton({ shouldFlipInRtl: true });

    expect(screen.getByRole('img', { name: TITLE })).toHaveClass('rtl-flip');
  });
});
