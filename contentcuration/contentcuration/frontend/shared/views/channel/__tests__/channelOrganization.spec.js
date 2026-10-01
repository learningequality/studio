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
    expect(await screen.findByRole('button', { name: 'Decline' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Decline' })).toHaveAttribute('aria-describedby');
    expect(screen.getByText(/Migration to Destination is awaiting review/i)).toBeInTheDocument();
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
    expect(
      await screen.findByText(/Migration to Destination is awaiting review/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });
  it('keeps the current organization visible and restores focus after decline', async () => {
    Channel.checkOrganizationMigration.mockResolvedValue({
      ...state,
      organization: 'source',
      organization_name: 'Aurora',
      pending: {
        id: 'request',
        organization: 'org',
        organization_name: 'Destination',
        can_decline: true,
      },
    });
    const { container } = render(ChannelOrganization, {
      routes: [],
      props: { channelId: 'channel' },
    });
    expect(
      await screen.findByText('Aurora', { selector: '.ui-select-display-value' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Migration to Destination is awaiting review',
    );
    Channel.checkOrganizationMigration.mockResolvedValue({
      ...state,
      organization: 'source',
      organization_name: 'Aurora',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(container.querySelector('.ui-select-label')).toHaveFocus());
    expect(
      screen.getByText('Aurora', { selector: '.ui-select-display-value' }),
    ).toBeInTheDocument();
  });

  it('keeps keyboard focus on the select while checking and announces the result', async () => {
    const { container } = render(ChannelOrganization, {
      routes: [],
      props: { channelId: 'channel', standalone: true },
    });
    await screen.findByText('Select an organization', { selector: '.ui-select-display-value' });
    let finish;
    Channel.checkOrganizationMigration.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    const select = container.querySelector('.ui-select-label');
    select.focus();
    await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');
    await waitFor(() =>
      expect(Channel.checkOrganizationMigration).toHaveBeenCalledWith('channel', 'org'),
    );
    expect(select).toHaveAttribute('tabindex', '0');
    expect(select).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Save organization' })).toBeDisabled();
    finish({ ...state, uncontested: false });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Migration cannot be done automatically',
      ),
    );
    expect(screen.getByRole('button', { name: 'Create ticket' })).toHaveAttribute(
      'aria-describedby',
      screen.getByRole('status').id,
    );
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
