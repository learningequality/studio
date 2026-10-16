import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import MigrationTable from '../MigrationTable.vue';
import { Invitation } from 'shared/data/resources';
import { migrationTableStrings as strings } from 'shared/strings/organizationStrings';

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

  it.each(['accept', 'decline'])('can %s a pending migration', async method => {
    Invitation[method].mockResolvedValue();
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    await screen.findByRole('heading', { name: strings.count$({ count: 1 }) });
    await userEvent.click(screen.getByRole('button', { name: strings.options$() }));
    await userEvent.click(await screen.findByText(strings[`${method}$`]()));
    await waitFor(() => expect(Invitation[method]).toHaveBeenCalledWith('request'));
    expect(await screen.findByText(strings.empty$())).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading')).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent(
      strings[method === 'accept' ? 'accepted$' : 'declined$']({ channel: migration.channel_name }),
    );
  });

  it.each(['accept', 'decline'])('focuses the next row after keyboard %s', async method => {
    const user = userEvent.setup();
    Invitation.fetchCollection.mockResolvedValue([
      migration,
      { ...migration, id: 'second', channel_name: 'Next channel' },
    ]);
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    const buttons = await screen.findAllByRole('button', { name: strings.options$() });
    buttons[0].focus();
    await user.keyboard('{Enter}');
    const accept = (await screen.findByText(strings.accept$())).closest('li');
    // JSDOM has no layout; KDropdownMenu checks these dimensions before
    // handling arrow keys in an open popover.
    const popover = accept.closest('.ui-popover');
    Object.defineProperties(popover, {
      clientWidth: { value: 200 },
      clientHeight: { value: 100 },
    });
    await waitFor(() => expect(accept).toHaveFocus());
    if (method === 'decline') {
      await user.keyboard('{ArrowDown}');
      await waitFor(() => expect(screen.getByText(strings.decline$()).closest('li')).toHaveFocus());
    }
    await user.keyboard('{Enter}');
    await waitFor(() => expect(Invitation[method]).toHaveBeenCalledWith('request'));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: strings.options$() })).toHaveLength(1),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: strings.options$() })).toHaveFocus(),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      strings[method === 'accept' ? 'accepted$' : 'declined$']({ channel: migration.channel_name }),
    );
  });

  it('recovers after the initial list request fails', async () => {
    Invitation.fetchCollection.mockRejectedValueOnce(new Error('Network error'));
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    await screen.findByRole('alert');
    expect(screen.getByRole('heading')).toHaveTextContent(strings.title$());
    expect(screen.queryByText(strings.count$({ count: 0 }))).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: strings.retry$() }));
    await screen.findByRole('button', { name: strings.options$() });
    expect(Invitation.fetchCollection).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a recoverable error when resolution fails', async () => {
    Invitation.accept.mockRejectedValue(new Error('Network error'));
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    await userEvent.click(await screen.findByRole('button', { name: strings.options$() }));
    await userEvent.click(await screen.findByText(strings.accept$()));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent(strings.title$());
    await userEvent.click(screen.getByRole('button', { name: strings.retry$() }));
    expect(await screen.findByText('Example channel')).toBeInTheDocument();
  });
});
