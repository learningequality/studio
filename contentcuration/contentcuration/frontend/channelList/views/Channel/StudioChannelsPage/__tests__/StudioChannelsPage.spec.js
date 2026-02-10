import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioChannelsPage from '../index.vue';

const router = new VueRouter();

function renderComponent(props = {}, slots = {}) {
  return render(StudioChannelsPage, {
    props: {
      loading: false,
      ...props,
    },
    slots,
    routes: router,
  });
}

describe('StudioChannelsPage', () => {
  it('shows header slot content', () => {
    renderComponent({}, { header: 'My Channels' });
    expect(screen.getByText('My Channels')).toBeInTheDocument();
  });

  it('shows cards slot content', async () => {
    renderComponent({}, { cards: '<div>Card</div>' });
    expect(await screen.findByText('Card')).toBeInTheDocument();
  });

  it('shows no channels message when not loading and no cards slot provided', () => {
    renderComponent();
    expect(screen.getByText('No channels found')).toBeInTheDocument();
  });

  it('does not show no channels message when loading', () => {
    renderComponent({ loading: true });
    expect(screen.queryByText('No channels found')).not.toBeInTheDocument();
  });

  it('does not show no channels message when cards slot is provided', () => {
    renderComponent({ loading: false }, { cards: '<div>Card</div>' });
    expect(screen.queryByText('No channels found')).not.toBeInTheDocument();
  });
});
