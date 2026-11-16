import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import ClickableRegion from '../index.vue';

describe('ClickableRegion', () => {
  it('renders a button with the given aria-label', () => {
    render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
      },
      routes: new VueRouter(),
    });

    expect(screen.getByRole('button', { name: 'Test label' })).toBeInTheDocument();
  });

  it('does not render the button when suppressed is true', () => {
    render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
        suppressed: true,
      },
      routes: new VueRouter(),
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('emits a click on the region, with no button, when pointer only', async () => {
    const { emitted, container } = render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
        pointerOnly: true,
      },
      routes: new VueRouter(),
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    await fireEvent.click(container.firstChild);
    expect(emitted().click).toHaveLength(1);
  });

  it('emits a single click event on mouse click', async () => {
    const { emitted } = render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
      },
      routes: new VueRouter(),
    });

    await fireEvent.click(screen.getByRole('button'));

    expect(emitted().click).toHaveLength(1);
  });

  it('emits a single click event on Enter key', async () => {
    const { emitted } = render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
      },
      routes: new VueRouter(),
    });

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(emitted().click).toHaveLength(1);
  });

  it('emits a single click event on Space key', async () => {
    const { emitted } = render(ClickableRegion, {
      props: {
        ariaLabel: 'Test label',
      },
      routes: new VueRouter(),
    });

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(emitted().click).toHaveLength(1);
  });

  it('focuses its button when asked to', async () => {
    render(
      {
        components: { ClickableRegion },
        template: `
          <div>
            <button @click="$refs.region.focus()">Elsewhere</button>
            <ClickableRegion ref="region" ariaLabel="Test label" />
          </div>
        `,
      },
      { routes: new VueRouter() },
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(screen.getByRole('button', { name: 'Test label' })).toHaveFocus();
  });

  describe('pressed while suppressed, then unsuppressed before the click', () => {
    const renderPressed = async () => {
      const { emitted, container, updateProps } = render(ClickableRegion, {
        props: { ariaLabel: 'Test label', suppressed: true },
        routes: new VueRouter(),
      });
      await fireEvent.pointerDown(container.firstChild);
      await updateProps({ suppressed: false });
      return { emitted, container };
    };

    it('ignores the pointer click', async () => {
      const { emitted, container } = await renderPressed();

      await fireEvent.click(container.firstChild, { detail: 1 });

      expect(emitted().click).toBeUndefined();
    });

    it('emits a keyboard click', async () => {
      const { emitted } = await renderPressed();

      await fireEvent.click(screen.getByRole('button'), { detail: 0 });

      expect(emitted().click).toHaveLength(1);
    });

    it('emits the next pointer click', async () => {
      const { emitted, container } = await renderPressed();
      await fireEvent.click(container.firstChild, { detail: 1 });

      await fireEvent.pointerDown(container.firstChild);
      await fireEvent.click(container.firstChild, { detail: 1 });

      expect(emitted().click).toHaveLength(1);
    });
  });
});
