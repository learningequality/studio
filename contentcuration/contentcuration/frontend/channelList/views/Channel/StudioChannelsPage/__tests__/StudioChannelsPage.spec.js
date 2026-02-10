import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioChannelsPage from '../index.vue';

const router = new VueRouter();

const INVITATION = {
  id: 'invitation-1',
  accepted: false,
  sender_name: 'User A',
  channel_name: 'Channel A',
  share_mode: 'edit',
};

const store = new Store({
  modules: {
    channelList: {
      namespaced: true,
      getters: {
        getInvitation: () => () => INVITATION,
      },
    },
  },
});

function renderComponent(props = {}, slots = {}) {
  return render(StudioChannelsPage, {
    props: {
      loading: false,
      ...props,
    },
    slots,
    routes: router,
    store,
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

  it('shows invitations when invitations prop provided', () => {
    renderComponent({ invitations: [INVITATION] });
    expect(screen.getByText('You have 1 invitation')).toBeInTheDocument();
    expect(screen.getByText('User A has invited you to edit Channel A')).toBeInTheDocument();
  });

  it('does not show invitations when invitations prop not provided', () => {
    renderComponent();
    expect(screen.queryByText(/invitation/)).not.toBeInTheDocument();
  });
});
