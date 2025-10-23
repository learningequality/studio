import { render, fireEvent, screen, within } from '@testing-library/vue';
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
    props: {
      listType: 'edit',
    },
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
    const card0 = await screen.findByTestId('card-0');
    const cardElements = screen.queryAllByTestId(testId => testId.startsWith('card-'));
    expect(await screen.findByText('New channel')).toBeInTheDocument();

    expect(card0).toHaveTextContent('channel one');
    expect(within(card0).getByTestId('details-button-0')).toBeInTheDocument();
    expect(within(card0).getByTestId('dropdown-button-0')).toBeInTheDocument();

    expect(cardElements.length).toBe(3);
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
    const cardElements = screen.queryAllByTestId(testId => testId.startsWith('card-'));
    expect(cardElements.length).toBe(0);
  });

  it('open dropdown for published channel', async () => {
    renderComponent(store);
    const dropdownButton = await screen.findByTestId('dropdown-button-0');
    await fireEvent.click(dropdownButton);
    expect(screen.getByText('Edit channel details')).toBeInTheDocument();
    expect(screen.getByText('Delete channel')).toBeInTheDocument();
    expect(screen.getByText('Go to source website')).toBeInTheDocument();
    expect(screen.getByText('View channel on Kolibri')).toBeInTheDocument();
    expect(screen.getByText('Copy channel token')).toBeInTheDocument();
    const listItems = document.querySelectorAll('.ui-focus-container-content li');
    expect(listItems.length).toBe(5);
  });

  it('open dropdown for unpulished channel', async () => {
    renderComponent(store);
    const dropdownButton = await screen.findByTestId('dropdown-button-1');
    await fireEvent.click(dropdownButton);
    expect(screen.getByText('Edit channel details')).toBeInTheDocument();
    expect(screen.getByText('Delete channel')).toBeInTheDocument();
    expect(screen.getByText('Go to source website')).toBeInTheDocument();
    expect(screen.getByText('View channel on Kolibri')).toBeInTheDocument();
    const listItems = document.querySelectorAll('.ui-focus-container-content li');
    expect(listItems.length).toBe(4);
  });

  it('opens delete modal and close', async () => {
    renderComponent(store);
    const dropdownButton = await screen.findByTestId('dropdown-button-0');
    await fireEvent.click(dropdownButton);
    const deleteButton = screen.getByText('Delete channel');
    await fireEvent.click(deleteButton);
    let deleteModal = document.querySelector('[data-testid="delete-modal"]');
    expect(deleteModal).not.toBeNull();
    const closeDeleteModal = screen.getByText('Cancel');
    await fireEvent.click(closeDeleteModal);
    deleteModal = document.querySelector('[data-testid="delete-modal"]');
    expect(deleteModal).toBeNull();
  });

  it('open copy modal and close', async () => {
    renderComponent(store);
    const dropdownButton = await screen.findByTestId('dropdown-button-0');
    await fireEvent.click(dropdownButton);
    const copyButton = screen.getByText('Copy channel token');
    await fireEvent.click(copyButton);
    let copyModal = document.querySelector('[data-testid="copy-modal"]');
    expect(copyModal).not.toBeNull();
    const closeCopyModal = screen.getByText('Close');
    await fireEvent.click(closeCopyModal);
    copyModal = document.querySelector('[data-testid="copy-modal"]');
    expect(copyModal).toBeNull();
  });

  it('detail button takes to details page', async () => {
    renderComponent(store);
    const detailsButton = await screen.findByTestId('details-button-0');
    await fireEvent.click(detailsButton);
    expect(router.currentRoute.path).toBe('/1/details');
  });
});
