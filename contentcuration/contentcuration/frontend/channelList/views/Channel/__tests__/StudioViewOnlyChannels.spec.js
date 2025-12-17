import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioViewOnlyChannels from '../StudioViewOnlyChannels.vue';

const mockChannels = [
  {
    id: 'a3e4bb9390034181b4f2dd4544b1041b',
    name: 'Testing - 2',
    description: 'Testing - 2',
    thumbnail: null,
    thumbnail_encoding: {},
    language: 'ceb',
    public: false,
    version: 0,
    last_published: null,
    ricecooker_version: null,
    deleted: false,
    source_url: '',
    demo_server_url: '',
    edit: false,
    view: true,
    modified: '2025-08-06T04:56:20.597463Z',
    primary_token: null,
    count: 0,
    unpublished_changes: true,
    thumbnail_url: null,
    published: false,
    publishing: false,
  },
];

const router = new VueRouter({
  routes: [
    { name: 'CHANNEL_DETAILS', path: '/:channelId/details' },
    { name: 'CHANNEL_EDIT', path: '/:channelId/:tab' },
  ],
});

function renderComponent(store) {
  return render(StudioViewOnlyChannels, {
    store,
    routes: router,
  });
}

const store = new Store({
  modules: {
    channel: {
      namespaced: true,
      getters: {
        channels: () => {
          return mockChannels;
        },
      },
      actions: {
        loadChannelList: jest.fn(),
        createChannel: jest.fn(),
      },
    },
  },
});

describe('StudioViewOnlyChannels.vue', () => {
  it('renders view only channels', async () => {
    renderComponent(store);
    const cards = await screen.findAllByTestId('card');
    expect(cards.length).toBe(1);
  });

  it(`Shows 'No channel found' when there are no channels`, async () => {
    const store = new Store({
      modules: {
        channel: {
          namespaced: true,
          getters: {
            channels: () => {
              return [];
            },
          },
          actions: {
            loadChannelList: jest.fn(),
            createChannel: jest.fn(),
          },
        },
      },
    });
    renderComponent(store);
    const cards = screen.queryAllByTestId('card');
    expect(cards.length).toBe(0);
  });
});
