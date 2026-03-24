import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import StudioAccordion from '../StudioAccordion.vue';

const router = new VueRouter({
  routes: [{ name: 'ACCORDION', path: '/accordion' }],
});

const renderAccordion = (props = {}) => {
  return render(StudioAccordion, {
    props: {
      id: 'test-accordion',
      ...props,
    },
    routes: router,
    slots: {
      title: 'Accordion Title',
      body: 'Accordion content goes here',
    },
  });
};

describe('StudioAccordion', () => {
  it('renders with title and collapsed content by default', () => {
    const { getByText, queryByText } = renderAccordion();

    expect(getByText('Accordion Title')).toBeInTheDocument();
    expect(queryByText('Accordion content goes here')).not.toBeInTheDocument();
  });

  it('establishes correct ARIA relationship between button and content', () => {
    const { getByRole } = renderAccordion({ id: 'my-accordion' });
    const button = getByRole('button', { name: /Accordion Title/i });

    expect(button).toHaveAttribute('id', 'my-accordion');
    expect(button).toHaveAttribute('aria-controls', 'my-accordion-content');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles accordion content when button is clicked', async () => {
    const user = userEvent.setup();
    const { getByRole, getByText, queryByText } = renderAccordion();

    const button = getByRole('button', { name: /Accordion Title/i });

    // Initially collapsed
    expect(queryByText('Accordion content goes here')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    await user.click(button);
    expect(getByText('Accordion content goes here')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    await user.click(button);
    expect(queryByText('Accordion content goes here')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders content region with correct ARIA attributes when expanded', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderAccordion({ id: 'my-accordion' });

    const button = getByRole('button', { name: /Accordion Title/i });
    await user.click(button);

    const region = getByRole('region');
    expect(region).toHaveAttribute('id', 'my-accordion-content');
    expect(region).toHaveAttribute('aria-labelledby', 'my-accordion');
  });
});
