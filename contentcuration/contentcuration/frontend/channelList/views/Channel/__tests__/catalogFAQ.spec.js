import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import CatalogFAQ from '../CatalogFAQ.vue';

const router = new VueRouter({
  routes: [{ name: 'CATALOG_FAQ', path: '/faq' }],
});

const renderComponent = (props = {}) => {
  return render(CatalogFAQ, {
    props,
    routes: router,
  });
};

describe('CatalogFAQ test cases', () => {
  it('renders the FAQ component', () => {
    renderComponent();
    const mainTitle = screen.getByText('Welcome to the Kolibri Content Library Catalog!');
    const subTitle = screen.getByText('About the Kolibri Content Library');
    expect(mainTitle).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
  });

  it('renders all FAQ items using StudioAccordion', async () => {
    renderComponent();
    const accordionTitles = [
      'How does Learning Equality determine what goes into this library?',
      'How is this library created and maintained?',
      'Have these sources been vetted or endorsed as classroom-safe and ready?',
      'Does Learning Equality own these resources?',
      'Does Learning Equality add new materials?',
      'How can I add my own materials or recommend materials from other creators for this library?',
      "I found something I'm interested in and would like to start using it. What should I do?",
      'What is a channel?',
      'How do I review the contents of the channels themselves?',
      'I want to use some of the resources in this channel, but not all of it. What should I do?',
      "What are 'resources for coaches'?",
      'I found a bug, broken link, or some mislabeled information within a resource. What should I do?',
      'What is Kolibri?',
      'How can I use Kolibri?',
      'Who are the makers of Kolibri?',
    ];
    expect(accordionTitles.length).toBe(15);
    accordionTitles.forEach(title => {
      expect(screen.getByRole('button', { name: title })).toBeInTheDocument();
    });
  });

  it('toggles the channel accordion when clicking the channel link button', async () => {
    const user = userEvent.setup();

    renderComponent();
    const channelLinkButton = screen.getByRole('link', { name: /What is a channel\?/i });
    const accordion = screen.getByRole('button', { name: 'What is a channel?' });
    const descriptionText = /A channel is Kolibri’s unit of organization for digital content./;

    // Accordion content should not be visible initially
    expect(accordion).toBeInTheDocument();
    expect(screen.queryByText(descriptionText)).not.toBeInTheDocument();

    // Click link button to expand accordion
    await user.click(channelLinkButton);

    // Accordion content should be visible
    expect(accordion).toBeInTheDocument();
    expect(screen.getByText(descriptionText)).toBeInTheDocument();
  });
});
