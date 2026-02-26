import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import StudioChannelCard from '../index.vue';

const CHANNEL = {
  id: 'channel-id',
  name: 'Channel title',
  language: 'en',
  description: 'Channel description',
  last_published: '2025-08-25T15:00:00Z',
  modified: '2026-01-10T08:00:00Z',
  count: 3,
  edit: true,
  published: true,
  bookmark: false,
  source_url: 'https://source.example.com',
  demo_server_url: 'https://demo.example.com',
};

const router = new VueRouter({
  routes: [{ name: 'CHANNEL_DETAILS', path: '/:channelId/details' }],
});

function renderComponent(props = {}, footerActionsSlot = '') {
  return render(StudioChannelCard, {
    props: {
      channel: CHANNEL,
      headingLevel: 2,
      ...props,
    },
    routes: router,
    slots: {
      footerActions: footerActionsSlot,
    },
  });
}

describe('StudioChannelCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    router.push('/').catch(() => {});
  });

  it('shows channel title', () => {
    renderComponent();
    expect(screen.getAllByText('Channel title').length).toBeGreaterThan(0);
  });

  it('shows channel description', () => {
    renderComponent();
    expect(screen.getByText('Channel description')).toBeInTheDocument();
  });

  it('shows channel language', () => {
    renderComponent();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('shows resource count', () => {
    renderComponent();
    expect(screen.getByText('3 resources')).toBeInTheDocument();
  });

  it('shows correct publish status for a published channel', () => {
    renderComponent();
    expect(screen.getByText(/^Published/)).toBeInTheDocument();
    expect(screen.queryByText('Unpublished')).not.toBeInTheDocument();
  });

  it('shows correct published status for an unpublished channel', () => {
    renderComponent({ channel: { ...CHANNEL, last_published: null } });
    expect(screen.getByText('Unpublished')).toBeInTheDocument();
  });

  it('always shows the details (info) button', () => {
    renderComponent();
    expect(screen.getByRole('link', { name: 'Details' })).toBeInTheDocument();
  });

  it('navigates to channel details page on info button click', async () => {
    renderComponent();
    const detailsLink = screen.getByRole('link', { name: 'Details' });
    expect(router.currentRoute.path).toBe('/');
    await userEvent.click(detailsLink);
    expect(router.currentRoute.path).toBe('/channel-id/details');
  });

  it('renders content provided in the footerActions slot', () => {
    renderComponent({}, '<button>Custom action</button>');
    expect(screen.getByRole('button', { name: 'Custom action' })).toBeInTheDocument();
  });

  it('emits click event when card is clicked', async () => {
    const { emitted } = renderComponent();
    const card = screen.getByTestId('channel-card');
    await userEvent.click(card);
    expect(emitted().click).toBeTruthy();
  });
});
