<template>

  <KPageContainer class="details-page">
    <KButton
      appearance="basic-link"
      :text="$tr('backToOrganizations')"
      @click="$router.push({ name: routeNames.ORGANIZATIONS })"
    />

    <div
      v-if="loading"
      class="centered"
    >
      <KCircularLoader />
    </div>
    <div
      v-else-if="error"
      class="centered"
    >
      <p>{{ $tr('loadError') }}</p>
      <KButton
        :text="$tr('retry')"
        @click="reload"
      />
    </div>
    <template v-else-if="organization">
      <header class="organization-header">
        <span class="thumbnail-placeholder">
          <KIcon
            icon="image"
            :color="$themePalette.grey.v_500"
          />
        </span>
        <div>
          <h1
            class="notranslate"
            dir="auto"
          >
            {{ organization.name }}
          </h1>
          <p :style="{ color: $themeTokens.annotation }">
            {{ organization.public ? $tr('publicOrganization') : $tr('privateOrganization') }}
          </p>
          <p
            class="notranslate"
            dir="auto"
          >
            {{ organization.description || $tr('noDescription') }}
          </p>
        </div>
      </header>

      <nav>
        <KTabsList
          tabsId="organization-details-tabs"
          :tabs="tabs"
          :activeTabId="activeTab"
          :ariaLabel="$tr('tabsLabel')"
        />
      </nav>

      <section v-if="activeTab === tabIds.CHANNELS">
        <p v-if="channelsUnavailable">
          {{ $tr('channelsUnavailable') }}
        </p>
        <p v-else-if="!channels.length">
          {{ $tr('noChannels') }}
        </p>
        <KTable
          v-else
          :caption="$tr('channelsCaption')"
          :headers="channelHeaders"
          :rows="channelRows"
          sortable
          :defaultSort="{ columnId: 'name', direction: 'asc' }"
        />
      </section>

      <section v-else>
        <p v-if="membersUnavailable">
          {{ $tr('membersUnavailable') }}
        </p>
        <p v-else-if="!members.length">
          {{ $tr('noMembers') }}
        </p>
        <KTable
          v-else
          :caption="$tr('membersCaption')"
          :headers="memberHeaders"
          :rows="memberRows"
          sortable
          :defaultSort="{ columnId: 'name', direction: 'asc' }"
        />
      </section>
    </template>
  </KPageContainer>

</template>


<script>

  import { computed, onMounted, ref } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import { RouteNames } from '../../constants';
  import { Channel, Organization, OrganizationMember } from 'shared/data/resources';

  const TabIds = {
    CHANNELS: 'channels',
    USERS: 'users',
  };

  function results(data) {
    return Array.isArray(data) ? data : data?.results || [];
  }

  async function fetchAccessibleChannels() {
    const channelLists = await Promise.all([
      Channel.where({ edit: true }, true),
      Channel.where({ view: true }, true),
      Channel.where({ public: true }, true),
    ]);
    const channelsById = new Map();
    for (const list of channelLists) {
      for (const channel of results(list)) {
        channelsById.set(channel.id, channel);
      }
    }
    return [...channelsById.values()];
  }

  export default {
    name: 'OrganizationDetails',
    setup(props) {
      const route = useRoute();
      const organization = ref(null);
      const channels = ref([]);
      const members = ref([]);
      const loading = ref(true);
      const error = ref(false);
      const channelsUnavailable = ref(false);
      const membersUnavailable = ref(false);
      const activeTab = computed(() =>
        route.query.tab === TabIds.USERS ? TabIds.USERS : TabIds.CHANNELS,
      );

      async function reload() {
        loading.value = true;
        error.value = false;
        channelsUnavailable.value = false;
        membersUnavailable.value = false;
        try {
          organization.value = await Organization.fetchModel(props.organizationId);
        } catch (e) {
          error.value = true;
          loading.value = false;
          return;
        }

        const [channelResult, memberResult] = await Promise.allSettled([
          fetchAccessibleChannels(),
          OrganizationMember.fetchCollection({
            organization: props.organizationId,
            page_size: 100,
          }),
        ]);
        if (channelResult.status === 'fulfilled') {
          const accessibleChannels = channelResult.value;
          const hasOrganizationMetadata = accessibleChannels.some(channel =>
            Object.prototype.hasOwnProperty.call(channel, 'organization'),
          );
          channelsUnavailable.value = !hasOrganizationMetadata;
          channels.value = accessibleChannels.filter(
            channel => channel.organization === props.organizationId && !channel.deleted,
          );
        } else {
          channelsUnavailable.value = true;
        }
        if (memberResult.status === 'fulfilled') {
          members.value = results(memberResult.value);
        } else {
          membersUnavailable.value = true;
        }
        loading.value = false;
      }

      onMounted(reload);
      return {
        organization,
        channels,
        members,
        loading,
        error,
        channelsUnavailable,
        membersUnavailable,
        activeTab,
        reload,
        routeNames: RouteNames,
        tabIds: TabIds,
      };
    },
    props: {
      organizationId: {
        type: String,
        required: true,
      },
    },
    computed: {
      tabs() {
        return [
          {
            id: TabIds.CHANNELS,
            label: this.$tr('channelsTab'),
            to: {
              name: RouteNames.ORGANIZATION_DETAILS,
              params: { organizationId: this.organizationId },
              query: { tab: TabIds.CHANNELS },
            },
          },
          {
            id: TabIds.USERS,
            label: this.$tr('usersTab'),
            to: {
              name: RouteNames.ORGANIZATION_DETAILS,
              params: { organizationId: this.organizationId },
              query: { tab: TabIds.USERS },
            },
          },
        ];
      },
      channelHeaders() {
        return [
          { label: this.$tr('name'), dataType: 'string', columnId: 'name' },
          { label: this.$tr('description'), dataType: 'string', columnId: 'description' },
          { label: this.$tr('status'), dataType: 'string', columnId: 'status' },
        ];
      },
      channelRows() {
        return this.channels.map(channel => [
          channel.name,
          channel.description || '',
          channel.published ? this.$tr('published') : this.$tr('draft'),
        ]);
      },
      memberHeaders() {
        return [
          { label: this.$tr('name'), dataType: 'string', columnId: 'name' },
          { label: this.$tr('email'), dataType: 'string', columnId: 'email' },
          { label: this.$tr('role'), dataType: 'string', columnId: 'role' },
          { label: this.$tr('status'), dataType: 'string', columnId: 'status' },
        ];
      },
      memberRows() {
        const roleLabels = {
          admin: this.$tr('adminRole'),
          editor: this.$tr('editorRole'),
          viewer: this.$tr('viewerRole'),
        };
        const statusLabels = {
          active: this.$tr('activeStatus'),
          inactive: this.$tr('inactiveStatus'),
          pending: this.$tr('pendingStatus'),
        };
        return this.members.map(member => [
          member.user_name || member.user_email,
          member.user_email,
          roleLabels[member.role] || member.role,
          statusLabels[member.status] || member.status,
        ]);
      },
    },
    $trs: {
      backToOrganizations: 'Back to organizations',
      loadError: 'There was a problem loading this organization.',
      retry: 'Retry',
      publicOrganization: 'Public organization',
      privateOrganization: 'Private organization',
      noDescription: 'No description provided',
      tabsLabel: 'Organization details',
      channelsTab: 'Channels',
      usersTab: 'Users',
      channelsUnavailable: 'Channel information is not available yet.',
      membersUnavailable: 'Member information is available only to organization members.',
      noChannels: 'This organization has no channels.',
      noMembers: 'This organization has no members.',
      channelsCaption: 'Channels in this organization',
      membersCaption: 'Users in this organization',
      name: 'Name',
      description: 'Description',
      email: 'Email',
      role: 'Role',
      status: 'Status',
      published: 'Published',
      draft: 'Draft',
      adminRole: 'Administrator',
      editorRole: 'Editor',
      viewerRole: 'Viewer',
      activeStatus: 'Active',
      inactiveStatus: 'Inactive',
      pendingStatus: 'Pending',
    },
  };

</script>


<style scoped>

  .details-page {
    max-width: 1200px;
    margin: 24px auto;
  }

  .organization-header {
    display: grid;
    grid-template-columns: minmax(120px, 280px) minmax(0, 1fr);
    gap: 48px;
    align-items: center;
    margin: 40px 0;
  }

  .thumbnail-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    border: 1px solid currentcolor;
    border-radius: 8px;
  }

  nav {
    margin-bottom: 24px;
  }

  .centered {
    margin: 84px auto;
    text-align: center;
  }

  @media (max-width: 600px) {
    .organization-header {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .thumbnail-placeholder {
      width: 160px;
    }
  }

</style>
