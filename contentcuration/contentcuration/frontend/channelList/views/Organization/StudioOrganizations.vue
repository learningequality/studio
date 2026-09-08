<template>

  <KPageContainer class="page-container">
    <div class="header">
      <h1>{{ $tr('title') }}</h1>
      <KButton
        primary
        :text="$tr('newOrganization')"
        @click="$router.push({ name: routeNames.NEW_ORGANIZATION })"
      />
    </div>

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
        @click="load"
      />
    </div>
    <p
      v-else-if="!organizations.length"
      class="centered"
    >
      {{ $tr('empty') }}
    </p>
    <KCardGrid
      v-else
      layout="1-1-1"
      class="cards"
    >
      <OrganizationCard
        v-for="organization in organizations"
        :key="organization.id"
        :organization="organization"
        @click="openOrganization(organization.id)"
      />
    </KCardGrid>
  </KPageContainer>

</template>


<script>

  import { useOrganizationList } from '../../composables/useOrganizations';
  import { RouteNames } from '../../constants';
  import OrganizationCard from './OrganizationCard.vue';

  export default {
    name: 'StudioOrganizations',
    components: { OrganizationCard },
    setup() {
      return { ...useOrganizationList(), routeNames: RouteNames };
    },
    methods: {
      openOrganization(organizationId) {
        this.$router.push({
          name: RouteNames.ORGANIZATION_DETAILS,
          params: { organizationId },
        });
      },
    },
    $trs: {
      title: 'Organizations',
      newOrganization: 'New organization',
      empty: 'No organizations found',
      loadError: 'There was a problem loading organizations.',
      retry: 'Retry',
    },
  };

</script>


<style scoped>

  .page-container {
    max-width: 1440px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin: 16px 0;
  }

  .cards {
    margin-top: 16px;
  }

  .centered {
    margin: 84px auto;
    text-align: center;
  }

</style>
