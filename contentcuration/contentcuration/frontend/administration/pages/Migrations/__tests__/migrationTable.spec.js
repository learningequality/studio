import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import MigrationTable from '../MigrationTable.vue';
import { Invitation } from 'shared/data/resources';

jest.mock('shared/data/resources', () => ({
  Invitation: { fetchCollection: jest.fn(), accept: jest.fn(), decline: jest.fn() },
}));

const migration = {
  id: 'request',
  channel: 'channel',
  channel_name: 'Example channel',
  organization: 'org',
  organization_name: 'Destination',
  sender_email: 'requestor@example.com',
};

describe('MigrationTable', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Invitation.fetchCollection.mockResolvedValue([migration]);
  });

  it.each([
    ['Accept', 'accept'],
    ['Decline', 'decline'],
  ])('can %s a pending migration', async (label, method) => {
    Invitation[method].mockResolvedValue();
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    expect(await screen.findByText('Example channel')).toBeInTheDocument();
    expect(screen.getByText('Destination')).toBeInTheDocument();
    expect(screen.getByText('requestor@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    await userEvent.click(await screen.findByText(label));
    await waitFor(() => expect(Invitation[method]).toHaveBeenCalledWith('request'));
    expect(await screen.findByText('No contested migrations')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading')).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('Example channel');
  });

  it('uses the singular heading for one request', async () => {
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    expect(
      await screen.findByRole('heading', { name: '1 contested migration' }),
    ).toBeInTheDocument();
  });

  it.each(['Accept', 'Decline'])('focuses the next row after keyboard %s', async label => {
    const user = userEvent.setup();
    Invitation.fetchCollection.mockResolvedValue([
      migration,
      { ...migration, id: 'second', channel_name: 'Next channel' },
    ]);
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    const buttons = await screen.findAllByRole('button', { name: 'Options' });
    buttons[0].focus();
    await user.keyboard('{Enter}');
    const accept = (await screen.findByText('Accept')).closest('li');
    // JSDOM has no layout; KDropdownMenu checks these dimensions before
    // handling arrow keys in an open popover.
    const popover = accept.closest('.ui-popover');
    Object.defineProperties(popover, {
      clientWidth: { value: 200 },
      clientHeight: { value: 100 },
    });
    await waitFor(() => expect(accept).toHaveFocus());
    if (label === 'Decline') {
      await user.keyboard('{ArrowDown}');
      await waitFor(() => expect(screen.getByText('Decline').closest('li')).toHaveFocus());
    }
    await user.keyboard('{Enter}');
    await waitFor(() => expect(Invitation[label.toLowerCase()]).toHaveBeenCalledWith('request'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Options' })).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Options' })).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('Example channel');
  });

  it('uses the title when the initial list request fails', async () => {
    Invitation.fetchCollection.mockRejectedValue(new Error('Network error'));
    render(MigrationTable, { routes: [] });
    await screen.findByRole('alert');
    expect(screen.getByRole('heading')).toHaveTextContent('Contested migrations');
    expect(screen.queryByText('0 contested migrations')).not.toBeInTheDocument();
  });

  it('shows a recoverable error when resolution fails', async () => {
    Invitation.accept.mockRejectedValue(new Error('Network error'));
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    await userEvent.click(await screen.findByRole('button', { name: 'Options' }));
    await userEvent.click(await screen.findByText('Accept'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('Contested migrations');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Example channel')).toBeInTheDocument();
  });
});
