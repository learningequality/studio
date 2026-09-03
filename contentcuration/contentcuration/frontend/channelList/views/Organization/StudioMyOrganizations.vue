<template>

  <div class="organizations-page">
    <StudioRaisedBox
      v-if="invitations.length"
      class="invitations"
    >
      <template #header>
        {{ $tr('invitations', { count: invitations.length }) }}
      </template>
      <template #main>
        <ul>
          <OrganizationInvitation
            v-for="invitation in invitations"
            :key="invitation.id"
            :invitation="invitation"
            @accept="accept(invitation.id)"
            @decline="decline(invitation.id)"
          />
        </ul>
      </template>
    </StudioRaisedBox>

    <KPageContainer class="page-container">
      <div
        class="header"
        :class="{ 'larger-window': !windowIsSmall }"
      >
        <h1>{{ $tr('title') }}</h1>
        <KButton
          appearance="raised-button"
          primary
          class="new-organization-button"
          :text="$tr('newOrganization')"
          @click="newOrganization"
        />
      </div>

      <div
        v-if="show('loader', organizationsLoading, 500)"
        class="loader"
      >
        <KCircularLoader />
      </div>

      <p
        v-else-if="!organizations.length"
        class="no-organizations"
      >
        {{ $tr('noOrganizationsFound') }}
      </p>

      <KCardGrid
        v-else
        layout="1-1-1"
        class="cards"
      >
        <OrganizationCard
          v-for="organization in organizations"
          :key="organization.id"
          :headingLevel="2"
          :organization="organization"
          @click="openOrganization(organization.id)"
        />
      </KCardGrid>
    </KPageContainer>
  </div>

</template>


<script>

  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { RouteNames, OrganizationEditTabs } from '../../constants';
  import { useOrganizationList } from '../../composables/useOrganizationList';
  import { useOrganizationInvitations } from '../../composables/useOrganizationInvitations';
  import OrganizationCard from './OrganizationCard.vue';
  import OrganizationInvitation from './OrganizationInvitation.vue';
  import StudioRaisedBox from 'shared/views/StudioRaisedBox';

  export default {
    name: 'StudioMyOrganizations',
    components: {
      OrganizationCard,
      OrganizationInvitation,
      StudioRaisedBox,
    },
    setup() {
      const { show } = useKShow();
      const { windowIsSmall } = useKResponsiveWindow();
      const { loading: organizationsLoading, organizations } = useOrganizationList();
      const { invitations, accept, decline } = useOrganizationInvitations();

      return {
        show,
        windowIsSmall,
        organizationsLoading,
        organizations,
        invitations,
        accept,
        decline,
      };
    },
    methods: {
      newOrganization() {
        this.$router.push({ name: RouteNames.NEW_ORGANIZATION });
      },
      openOrganization(organizationId) {
        this.$router.push({
          name: RouteNames.ORGANIZATION_EDIT,
          params: { organizationId, tab: OrganizationEditTabs.DETAILS },
          query: { last: RouteNames.MY_ORGANIZATIONS },
        });
      },
    },
    $trs: {
      title: 'Organizations',
      newOrganization: 'New organization',
      noOrganizationsFound: 'You are not a member of any organizations yet.',
      invitations: 'You have {count, plural,\n =1 {# invitation}\n other {# invitations}}',
    },
  };

</script>


<style lang="scss" scoped>

  .organizations-page {
    padding-bottom: 24px;
    margin: auto;
  }

  .invitations {
    max-width: 900px;
    margin: 24px auto;
  }

  .page-container {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    flex-direction: column;
    margin-top: 16px;

    .new-organization-button {
      align-self: flex-start;
      margin-top: 16px;
    }
  }

  .header.larger-window {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    .new-organization-button {
      margin-top: 0;
    }
  }

  .no-organizations,
  .loader {
    max-width: 800px;
    margin: 84px auto;
    font-size: 24px;
    text-align: center;
  }

  .cards {
    margin-top: 16px;
  }

</style>
