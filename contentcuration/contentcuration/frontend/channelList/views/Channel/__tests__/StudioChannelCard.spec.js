import { render, fireEvent, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { Store } from 'vuex';
import StudioChannelCard from '../components/StudioChannelCard.vue';

const unpublishedChannel = {
  id: '36b0a7090f174d488ae7526c9e15a00e',
  name: 'channel one',
  description: 'channel one description',
  thumbnail_encoding: {
    base64: '',
  },
  thumbnail: '16bf072847b529c7528ded79aee808df.png',
  language: 'ach',
  public: false,
  version: 0,
  last_published: false,
  deleted: false,
  source_url: '',
  demo_server_url: '',
  edit: true,
  view: false,
  thumbnail_url: '',
  published: false,
  publishing: false,
  staging_root_id: null,
  __last_fetch: 1764224713827,
  bookmark: true,
};

const publishedChannel = {
  id: '36b0a7090f174d488ae7526c9e15a00e',
  name: 'channel one',
  description: 'channel one description',
  thumbnail_encoding: {
    base64: '',
  },
  thumbnail: '16bf072847b529c7528ded79aee808df.png',
  language: 'ach',
  public: false,
  version: 0,
  last_published: '2025-08-25T15:54:56.622912Z',
  modified: '2025-08-25T15:54:56.748897Z',
  deleted: false,
  source_url: '',
  demo_server_url: '',
  edit: true,
  view: false,
  thumbnail_url: '',
  published: true,
  publishing: false,
  staging_root_id: null,
  __last_fetch: 1764224713827,
  bookmark: true,
};

const router = new VueRouter({
  routes: [
    { name: 'CHANNEL_DETAILS', path: '/:channelId/details' },
    { name: 'CHANNEL_EDIT', path: '/:channelId/:tab' },
  ],
});

function renderComponent(props = {}, store) {
  return render(StudioChannelCard, {
    store,
    props,
    routes: router,
  });
}

const store = new Store({
  modules: {
    channel: {
      namespaced: true,
      actions: {
        deleteChannel: jest.fn(),
        removeViewer: jest.fn(),
      },
    },
  },
});

describe('StudioChannelCard.vue', () => {
  it('open dropdown for published channel', async () => {
    renderComponent({ channel: publishedChannel }, store);
    const card = await screen.findByTestId('card');
    expect(card).toHaveTextContent('channel one');
    const dropdownButton = await screen.findByTestId('dropdown-button');
    await fireEvent.click(dropdownButton);
    expect(screen.getByText('Edit channel details')).toBeInTheDocument();
    expect(screen.getByText('Copy channel token')).toBeInTheDocument();
    expect(screen.getByText('Delete channel')).toBeInTheDocument();
    const listItems = document.querySelectorAll('.ui-focus-container-content li');
    expect(listItems.length).toBe(3);
  });

  it('open dropdown for unpulished channel', async () => {
    renderComponent({ channel: unpublishedChannel }, store);
    const dropdownButton = await screen.findByTestId('dropdown-button');
    await fireEvent.click(dropdownButton);
    expect(screen.getByText('Edit channel details')).toBeInTheDocument();
    expect(screen.getByText('Delete channel')).toBeInTheDocument();
    const listItems = document.querySelectorAll('.ui-focus-container-content li');
    expect(listItems.length).toBe(2);
  });

  it('opens delete modal and close', async () => {
    renderComponent({ channel: unpublishedChannel }, store);
    const dropdownButton = await screen.findByTestId('dropdown-button');
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
    renderComponent({ channel: publishedChannel }, store);
    const dropdownButton = await screen.findByTestId('dropdown-button');
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
    renderComponent({ channel: unpublishedChannel }, store);
    const detailsButton = await screen.findByTestId('details-button');
    await fireEvent.click(detailsButton);
    expect(router.currentRoute.path).toBe('/36b0a7090f174d488ae7526c9e15a00e/details');
  });
});
