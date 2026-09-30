import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router/composables';
import { Organization } from 'shared/data/resources';
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
  loadError: {
    message: 'Unable to load organizations. Please try again.',
    context: 'Error loading organization filter options',
  },
  retry: {
    message: 'Retry',
    context: 'Reload organization filter options',
  },
});

// Memberships include organizations with no channels in this list. Also retain
// organizations on directly shared channels where the user is not a member.
export function useChannelOrganizationFilter(channels) {
  const route = useRoute();
  const memberships = ref([]);
  const organizationLoadError = ref(false);
  async function loadOrganizations() {
    organizationLoadError.value = false;
    try {
      memberships.value = await Organization.fetchCollection({ member: true, page_size: 100 });
    } catch (error) {
      organizationLoadError.value = true;
    }
  }
  onMounted(loadOrganizations);
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
    for (const organization of memberships.value) {
      organizations.set(organization.id, organization.name);
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
    organizationLoadError,
    loadOrganizations,
    organizationLoadError$: strings.loadError$,
    retryOrganizations$: strings.retry$,
    organizationFilter: filter,
    organizationOptions: options,
    filteredChannels,
    filterByOrganization$: strings.filterByOrganization$,
  };
}
