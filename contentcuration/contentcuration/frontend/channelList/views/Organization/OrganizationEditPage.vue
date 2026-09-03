<template>

  <StudioImmersiveModal
    :key="organizationId || 'new'"
    v-model="dialog"
  >
    <template #header>
      <span class="notranslate">
        {{ isNew ? $tr('newOrganizationTitle') : organization ? organization.name : '' }}
      </span>
    </template>

    <nav
      v-if="!isNew"
      class="tabs-nav"
    >
      <KTabsList
        tabsId="organization-edit-tabs"
        :tabs="tabs"
        :activeTabId="tab"
        :ariaLabel="$tr('tabsLabel')"
      />
    </nav>

    <div class="content">
      <OrganizationDetailsTab
        v-if="isNew || tab === tabIds.DETAILS"
        :organization="organization"
        :loading="loading"
        :isNew="isNew"
        :save="isNew ? create : update"
        :isAdmin="isAdmin"
        @created="onCreated"
      />
      <OrganizationSharingTab
        v-else-if="!loading"
        :organizationId="organizationId"
        :isAdmin="isAdmin"
      />
    </div>
  </StudioImmersiveModal>

</template>


<script>

  import { RouteNames, OrganizationEditTabs, OrganizationRoles } from '../../constants';
  import { useOrganization } from '../../composables/useOrganization';
  import OrganizationDetailsTab from './OrganizationDetailsTab.vue';
  import OrganizationSharingTab from './OrganizationSharingTab.vue';
  import { routerMixin } from 'shared/mixins';
  import StudioImmersiveModal from 'shared/views/StudioImmersiveModal';

  export default {
    name: 'OrganizationEditPage',
    components: {
      StudioImmersiveModal,
      OrganizationDetailsTab,
      OrganizationSharingTab,
    },
    mixins: [routerMixin],
    setup(props) {
      const { loading, organization, update, create } = useOrganization(props.organizationId);

      return {
        loading,
        organization,
        update,
        create,
        tabIds: OrganizationEditTabs,
      };
    },
    props: {
      organizationId: {
        type: String,
        default: '',
      },
      tab: {
        type: String,
        default: OrganizationEditTabs.DETAILS,
      },
    },
    data() {
      return {
        dialog: true,
      };
    },
    computed: {
      isNew() {
        return !this.organizationId;
      },
      isAdmin() {
        if (this.isNew) {
          return true;
        }
        return Boolean(this.organization && this.organization.role === OrganizationRoles.ADMIN);
      },
      tabs() {
        return [
          {
            id: OrganizationEditTabs.DETAILS,
            label: this.$tr('detailsTab'),
            to: this.tabLink(OrganizationEditTabs.DETAILS),
          },
          {
            id: OrganizationEditTabs.SHARING,
            label: this.$tr('sharingTab'),
            to: this.tabLink(OrganizationEditTabs.SHARING),
          },
        ];
      },
      backLink() {
        return {
          name: this.$route.query.last || RouteNames.MY_ORGANIZATIONS,
          query: {
            ...this.$route.query,
            last: undefined,
          },
        };
      },
    },
    watch: {
      tab() {
        this.updateTitle();
      },
      organization() {
        this.updateTitle();
      },
      isNew(isNew) {
        if (!isNew) {
          this.updateTitle();
        }
      },
      dialog(newValue) {
        if (!newValue) {
          this.$router.push(this.backLink).catch(() => {});
        }
      },
    },
    mounted() {
      this.updateTitle();
    },
    methods: {
      tabLink(tab) {
        return {
          name: RouteNames.ORGANIZATION_EDIT,
          params: { organizationId: this.organizationId, tab },
        };
      },
      onCreated(organizationId) {
        this.$router.replace({
          name: RouteNames.ORGANIZATION_EDIT,
          params: { organizationId, tab: OrganizationEditTabs.DETAILS },
          query: this.$route.query,
        });
      },
      updateTitle() {
        if (this.isNew) {
          this.updateTabTitle(this.$tr('newOrganizationTitle'));
          return;
        }
        const orgName = this.organization ? this.organization.name : '';
        const tabLabel =
          this.tab === OrganizationEditTabs.SHARING
            ? this.$tr('sharingTab')
            : this.$tr('detailsTab');
        this.updateTabTitle(orgName ? `${tabLabel} - ${orgName}` : tabLabel);
      },
    },
    $trs: {
      tabsLabel: 'Organization edit tabs',
      detailsTab: 'Details',
      sharingTab: 'Sharing',
      newOrganizationTitle: 'New organization',
    },
  };

</script>


<style lang="scss" scoped>

  .tabs-nav {
    padding: 8px 24px 0;
  }

  .content {
    max-width: 1000px;
    padding: 24px;
    margin: 0 auto;
  }

</style>
