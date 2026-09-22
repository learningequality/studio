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
  });

  it('shows a recoverable error when resolution fails', async () => {
    Invitation.accept.mockRejectedValue(new Error('Network error'));
    render(MigrationTable, { routes: [{ name: 'CHANNEL', path: '/channels/:channelId' }] });
    await userEvent.click(await screen.findByRole('button', { name: 'Options' }));
    await userEvent.click(await screen.findByText('Accept'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Example channel')).toBeInTheDocument();
  });
});
