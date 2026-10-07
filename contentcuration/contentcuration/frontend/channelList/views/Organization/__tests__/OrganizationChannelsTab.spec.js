import { render, screen, within } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import OrganizationChannelsTab from '../OrganizationChannelsTab.vue';
import { Organization } from 'shared/data/resources';
import { organizationStrings } from 'shared/strings/organizationStrings';

const localVue = createLocalVue();
localVue.use(VueRouter);

const ONE_MB = 1000 * 1000;

const renderTab = () =>
  render(OrganizationChannelsTab, {
    localVue,
    router: new VueRouter(),
    props: { organizationId: 'org-1' },
  });

describe('OrganizationChannelsTab', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lists the organization's channels with their sizes and the total size", async () => {
    jest.spyOn(Organization, 'fetchChannels').mockResolvedValue({
      channels: [
        { id: 'channel-1', name: 'Alpha', description: 'First channel', size: 10 * ONE_MB },
        { id: 'channel-2', name: 'Beta', description: 'Second channel', size: 560 * ONE_MB },
      ],
      size: 570 * ONE_MB,
    });

    renderTab();

    const table = await screen.findByRole('grid', { name: organizationStrings.channelsTab$() });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByRole('link', { name: /Alpha/ })).toBeInTheDocument();
    expect(within(rows[1]).getByText('First channel')).toBeInTheDocument();
    expect(within(rows[1]).getByText('10 MB')).toBeInTheDocument();
    expect(within(rows[2]).getByText('560 MB')).toBeInTheDocument();
    expect(screen.getByTestId('total-size')).toHaveTextContent(
      organizationStrings.totalSize$({ size: '570 MB' }),
    );
    expect(Organization.fetchChannels).toHaveBeenCalledWith('org-1');
  });

  it('opens a channel in a new tab', async () => {
    const urls = window.Urls;
    window.Urls = { channel: channelId => `/channels/${channelId}/` };
    jest.spyOn(Organization, 'fetchChannels').mockResolvedValue({
      channels: [{ id: 'channel-1', name: 'Alpha', description: '', size: 0 }],
      size: 0,
    });

    try {
      renderTab();

      const link = await screen.findByRole('link', { name: /Alpha/ });
      expect(link).toHaveAttribute('href', '/channels/channel-1/');
      expect(link).toHaveAttribute('target', '_blank');
    } finally {
      window.Urls = urls;
    }
  });

  it('shows a message when the organization has no channels', async () => {
    jest.spyOn(Organization, 'fetchChannels').mockResolvedValue({ channels: [], size: 0 });

    renderTab();

    expect(await screen.findByText(organizationStrings.noChannels$())).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('shows an error instead of an empty list when the channels fail to load', async () => {
    jest.spyOn(Organization, 'fetchChannels').mockRejectedValue(new Error('Not found'));

    renderTab();

    expect(await screen.findByText(organizationStrings.loadChannelsError$())).toBeInTheDocument();
    expect(screen.queryByText(organizationStrings.noChannels$())).not.toBeInTheDocument();
  });
});
