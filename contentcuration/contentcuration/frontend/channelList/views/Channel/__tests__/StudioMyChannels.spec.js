import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioMyChannels from '../StudioMyChannels.vue';

const mockChannels = [
  {
    id: '1',
    name: 'channel one',
    edit: true,
    published: true,
    source_url: 'https://example.com',
    demo_server_url: 'https://demo.com',
    deleted: false,
    modified: 2,
    last_published: 1,
    description: 'Channel one description',
    bookmark: true,
    count: 5,
    thumbnail_url: '',
    language: 'en',
  },
  {
    id: '2',
    name: 'channel two',
    edit: true,
    published: false,
    source_url: 'https://example.com',
    demo_server_url: 'https://demo.com',
    deleted: false,
    modified: 2,
    last_published: 1,
    description: 'Channel two description',
    bookmark: false,
    count: 5,
    thumbnail_url: '',
    language: 'en',
  },
  {
    id: '3',
    name: 'channel three',
    edit: true,
    published: true,
    source_url: 'https://example.com',
    demo_server_url: 'https://demo.com',
    deleted: false,
    modified: 2,
    last_published: 1,
    description: 'Channel three description',
    bookmark: false,
    count: 5,
    thumbnail_url: '',
    language: 'en',
  },
];

const router = new VueRouter({
  routes: [
    { name: 'CHANNEL_DETAILS', path: '/:channelId/details' },
    { name: 'CHANNEL_EDIT', path: '/:channelId/:tab' },
  ],
});

function renderComponent(store) {
  return render(StudioMyChannels, {
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

describe('StudioMyChannels.vue', () => {
  it('renders my channels', async () => {
    renderComponent(store);
    const cards = await screen.findAllByTestId('card');
    expect(cards.length).toBe(3);
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
