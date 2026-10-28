import { createTranslator } from 'shared/i18n';

export const channelOrganizationFilterStrings = createTranslator('ChannelOrganizationFilter', {
  filterByOrganization: {
    message: 'Filter by organization',
    context: 'Label for filtering the current channel list by organization',
  },
  allOrganizations: {
    message: 'All organizations',
    context: 'Show all channels, including channels without an organization',
  },
  unavailableOrganization: {
    message: 'Unavailable organization',
    context: 'Selected organization has no accessible channels in this list',
  },
  loadError: {
    message: 'Unable to load organizations. Please try again.',
    context: 'Error loading organization filter options',
  },
  retry: {
    message: 'Retry',
    context: 'Reload organization filter options',
  },
});
