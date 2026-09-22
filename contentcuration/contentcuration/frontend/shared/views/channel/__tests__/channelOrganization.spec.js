import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ChannelOrganization from '../ChannelOrganization.vue';
import { Channel, Invitation } from 'shared/data/resources';

jest.mock('shared/data/resources', () => ({
  Channel: { checkOrganizationMigration: jest.fn(), migrateOrganization: jest.fn() },
  Invitation: { createMigration: jest.fn(), decline: jest.fn() },
}));

const state = {
  organization: null,
  organizations: [{ id: 'org', name: 'Destination' }],
  pending: null,
};

async function selectOrganization() {
  await userEvent.click(await screen.findByText('Channel organization'));
  await userEvent.click(screen.getByText('Destination', { selector: '.ui-select-option-basic' }));
}

describe('ChannelOrganization', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Channel.checkOrganizationMigration.mockImplementation((id, organization) =>
      Promise.resolve({ ...state, ...(organization ? { uncontested: false } : {}) }),
    );
  });

  it('offers a ticket for a contested selection without changing the channel', async () => {
    render(ChannelOrganization, { routes: [], props: { channelId: 'channel' } });
    await selectOrganization();
    expect(await screen.findByRole('button', { name: 'Create ticket' })).toBeInTheDocument();
    expect(Channel.migrateOrganization).not.toHaveBeenCalled();
  });

  it('creates a request and locks the selection', async () => {
    Invitation.createMigration.mockResolvedValue({ id: 'request' });
    render(ChannelOrganization, { routes: [], props: { channelId: 'channel' } });
    await selectOrganization();
    Channel.checkOrganizationMigration.mockResolvedValue({
      ...state,
      pending: {
        id: 'request',
        organization: 'org',
        organization_name: 'Destination',
        can_decline: true,
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Create ticket' }));
    await waitFor(() => expect(Invitation.createMigration).toHaveBeenCalledWith('channel', 'org'));
    expect(await screen.findByRole('button', { name: 'Decline' })).toBeInTheDocument();
    expect(screen.getByText(/close the current migration request/i)).toBeInTheDocument();
  });

  it('does not offer decline to another channel editor', async () => {
    Channel.checkOrganizationMigration.mockResolvedValue({
      ...state,
      pending: {
        id: 'request',
        organization: 'org',
        organization_name: 'Destination',
        can_decline: false,
      },
    });
    render(ChannelOrganization, { routes: [], props: { channelId: 'channel' } });
    expect(await screen.findByText(/close the current migration request/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });
  it('saves an uncontested selection only after the save action', async () => {
    Channel.checkOrganizationMigration.mockImplementation((id, organization) =>
      Promise.resolve({ ...state, ...(organization ? { uncontested: true } : {}) }),
    );
    Channel.migrateOrganization.mockResolvedValue({ organization: 'org' });
    render(ChannelOrganization, { routes: [], props: { channelId: 'channel', standalone: true } });
    await selectOrganization();
    const button = screen.getByRole('button', { name: 'Save organization' });
    await waitFor(() => expect(button).toBeEnabled());
    expect(Channel.migrateOrganization).not.toHaveBeenCalled();
    Channel.checkOrganizationMigration.mockResolvedValue({ ...state, organization: 'org' });
    await userEvent.click(button);
    await waitFor(() => expect(Channel.migrateOrganization).toHaveBeenCalledWith('channel', 'org'));
    await waitFor(() => expect(button).toBeDisabled());
  });

  it('recovers after a failed organization request', async () => {
    Channel.checkOrganizationMigration.mockRejectedValueOnce(new Error('Network error'));
    const { emitted } = render(ChannelOrganization, {
      routes: [],
      props: { channelId: 'channel' },
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // A failed organization lookup must not disable unrelated channel edits.
    expect(emitted().blocked.slice(-1)[0]).toEqual([false]);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await selectOrganization();
    expect(await screen.findByRole('button', { name: 'Create ticket' })).toBeInTheDocument();
  });
});
