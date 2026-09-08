import { computed } from 'vue';
import { useRoute } from 'vue-router/composables';
import { useFilter } from 'shared/composables/useFilter';
import { createTranslator } from 'shared/i18n';

const strings = createTranslator('ChannelOrganizationFilter', {
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
});

// Derive options from the unfiltered list so selecting one organization does not
// remove the others. Association metadata is supplied by the channel Resource.
export function useChannelOrganizationFilter(channels) {
  const route = useRoute();
  const selectedId = computed(() => {
    const value = route.query.organization;
    return typeof value === 'string' ? value : '';
  });
  const filterMap = computed(() => {
    const organizations = new Map();
    for (const channel of channels.value) {
      if (channel.organization && channel.organization_name) {
        organizations.set(channel.organization, channel.organization_name);
      }
    }
    const entries = [...organizations.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const map = Object.fromEntries([
      ['', { label: strings.allOrganizations$() }],
      ...entries.map(([id, label]) => [id, { label }]),
    ]);
    if (selectedId.value && !organizations.has(selectedId.value)) {
      map[selectedId.value] = { label: strings.unavailableOrganization$() };
    }
    return map;
  });
  const { filter, options } = useFilter({
    name: 'organization',
    filterMap,
    defaultValue: '',
  });
  const filteredChannels = computed(() =>
    selectedId.value
      ? channels.value.filter(channel => channel.organization === selectedId.value)
      : channels.value,
  );

  return {
    organizationFilter: filter,
    organizationOptions: options,
    filteredChannels,
    filterByOrganization$: strings.filterByOrganization$,
  };
}
