<template>

  <VApp>
    <VToolbar
      v-if="libraryMode || isFAQPage"
      color="appBarDark"
      dark
      :clipped-left="!$isRTL"
      :clipped-right="$isRTL"
      app
    >
      <VToolbarSideIcon
        :href="homeLink"
        exact
        color="appBarDark"
        class="ma-0"
        style="border-radius: 8px"
      >
        <KLogo
          altText="Kolibri Logo with background"
          :showBackground="true"
          :size="36"
        />
      </VToolbarSideIcon>

      <VToolbarTitle class="notranslate">
        {{ isFAQPage ? $tr('frequentlyAskedQuestions') : $tr('libraryTitle') }}
      </VToolbarTitle>
    </VToolbar>

    <StudioNavigation
      v-else
      :tabs="navigationTabs"
    />

    <VContent>
      <StudioOfflineAlert
        v-if="!isCatalogPage"
        :offset="toolbarHeight"
      />
      <VContainer
        id="main"
        role="main"
        tabindex="-1"
        fluid
        class="main-container pa-0"
        :style="`height: calc(100vh - ${contentOffset}px); margin-top: ${offline ? 48 : 0}px;`"
      >
        <VContainer
          fluid
          class="h-100"
          :class="isCatalogPage ? 'pa-0' : 'pa-4'"
        >
          <VLayout
            row
            wrap
            justify-center
          >
            <VFlex
              xs12
              sm10
              md8
              lg6
            >
              <StudioRaisedBox
                v-if="invitationList.length"
                v-show="isChannelList"
              >
                <template #header>
                  {{ $tr('invitations', { count: invitationList.length }) }}
                </template>
                <template #main>
                  <ul class="invitation-list">
                    <ChannelInvitation
                      v-for="invitation in invitationList"
                      :key="invitation.id"
                      :invitationID="invitation.id"
                    />
                  </ul>
                </template>
              </StudioRaisedBox>
            </VFlex>
          </VLayout>
          <ChannelListAppError
            v-if="fullPageError"
            :error="fullPageError"
          />
          <RouterView v-else />
        </VContainer>
      </VContainer>
    </VContent>
    <GlobalSnackbar />
    <PolicyModals />
  </VApp>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import {
    RouteNames,
    ChannelInvitationMapping,
    ListTypeToRouteMapping,
    RouteToListTypeMapping,
  } from '../constants';
  import ChannelListAppError from './ChannelListAppError';
  import ChannelInvitation from './Channel/ChannelInvitation';
  import StudioRaisedBox from 'shared/views/StudioRaisedBox.vue';
  import { ChannelListTypes } from 'shared/constants';
  import { constantsTranslationMixin, routerMixin } from 'shared/mixins';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import StudioNavigation from 'shared/views/StudioNavigation';
  import StudioOfflineAlert from 'shared/views/StudioOfflineAlert.vue';
  import PolicyModals from 'shared/views/policies/PolicyModals';

  const CATALOG_PAGES = [
    RouteNames.CATALOG_ITEMS,
    RouteNames.CATALOG_DETAILS,
    RouteNames.CATALOG_FAQ,
  ];

  const CHANNEL_SETS = 'channel_sets';
  const ListTypeToAnalyticsLabel = {
    [ChannelListTypes.EDITABLE]: 'EDITABLE',
    [ChannelListTypes.PUBLIC]: 'PUBLIC',
    [ChannelListTypes.STARRED]: 'STARRED',
    [ChannelListTypes.VIEW_ONLY]: 'VIEW_ONLY',
    [CHANNEL_SETS]: 'CHANNEL_SETS',
  };

  export default {
    name: 'ChannelListIndex',
    components: {
      StudioNavigation,
      ChannelInvitation,
      ChannelListAppError,
      GlobalSnackbar,
      PolicyModals,
      StudioOfflineAlert,
      StudioRaisedBox,
    },
    mixins: [constantsTranslationMixin, routerMixin],
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
      ...mapGetters(['loggedIn']),
      ...mapGetters('channelList', ['invitations']),

      navigationTabs() {
        if (!this.loggedIn) return [];

        const tabs = [];

        this.lists.forEach(listType => {
          tabs.push({
            id: listType,
            label: this.translateConstant(listType),
            to: this.getChannelLink(listType),
            badgeValue: this.invitationsByListCounts[listType] || 0,
            analyticsLabel: ListTypeToAnalyticsLabel[listType],
          });
        });

        tabs.push({
          id: 'catalog',
          label: this.$tr('catalog'),
          to: this.catalogLink,
          badgeValue: 0,
          analyticsLabel: 'PUBLIC',
        });

        tabs.push({
          id: CHANNEL_SETS,
          label: this.$tr('channelSets'),
          to: this.channelSetLink,
          badgeValue: 0,
          analyticsLabel: 'CHANNEL_SETS',
        });

        return tabs;
      },

      fullPageError() {
        return this.$store.state.errors.fullPageError;
      },
      libraryMode() {
        return window.libraryMode;
      },
      isFAQPage() {
        return this.$route.name === RouteNames.CATALOG_FAQ;
      },
      isCatalogPage() {
        return this.$route.name === RouteNames.CATALOG_ITEMS;
      },
      currentListType() {
        return RouteToListTypeMapping[this.$route.name];
      },
      toolbarHeight() {
        return this.loggedIn && !this.isFAQPage ? 112 : 64;
      },
      contentOffset() {
        return this.toolbarHeight + (this.offline ? 48 : 0);
      },
      lists() {
        return Object.values(ChannelListTypes).filter(l => l !== 'public');
      },
      invitationList() {
        const invitations = this.invitations;
        return (
          invitations.filter(
            i => ChannelInvitationMapping[i.share_mode] === this.currentListType,
          ) || []
        );
      },
      invitationsByListCounts() {
        const inviteMap = {};
        Object.values(ChannelListTypes).forEach(type => {
          inviteMap[type] = this.invitations.filter(
            i => ChannelInvitationMapping[i.share_mode] === type,
          ).length;
        });
        return inviteMap;
      },
      channelSetLink() {
        return { name: RouteNames.CHANNEL_SETS };
      },
      catalogLink() {
        return { name: RouteNames.CATALOG_ITEMS };
      },
      isChannelList() {
        return this.lists.includes(this.currentListType);
      },
      homeLink() {
        return this.libraryMode ? window.Urls.base() : window.Urls.channels();
      },
    },
    watch: {
      $route(route) {
        if (route.name === RouteNames.CHANNELS_EDITABLE) {
          this.loggedIn
            ? this.loadInvitationList()
            : this.$router.replace({ name: RouteNames.CATALOG_ITEMS });
        }
        if (this.fullPageError) {
          this.$store.dispatch('errors/clearError');
        }
      },
      '$route.name': {
        handler: 'updateTitleForPage',
        immediate: true,
      },
    },
    created() {
      if (this.loggedIn) {
        this.loadInvitationList();
      } else if (!CATALOG_PAGES.includes(this.$route.name)) {
        this.$router.replace({ name: RouteNames.CATALOG_ITEMS });
      }
    },
    mounted() {
      if (localStorage.snackbar) {
        this.$store.dispatch('showSnackbarSimple', localStorage.snackbar);
        delete localStorage.snackbar;
      }
    },
    methods: {
      ...mapActions('channelList', ['loadInvitationList']),
      getChannelLink(listType) {
        return { name: ListTypeToRouteMapping[listType] };
      },
      updateTitleForPage() {
        // Updates the tab title every time the top-level route changes
        let title;
        const routeName = this.$route.name;
        if (routeName === RouteNames.CHANNEL_SETS) {
          title = this.$tr('channelSets');
        } else if (routeName === RouteNames.CATALOG_ITEMS) {
          title = this.translateConstant('public');
        } else if (routeName === RouteNames.CHANNELS_VIEW_ONLY) {
          title = this.translateConstant('view');
        } else if (routeName === RouteNames.CHANNELS_STARRED) {
          title = this.translateConstant('bookmark');
        } else if (routeName === RouteNames.CHANNELS_EDITABLE) {
          title = this.translateConstant('edit');
        }
        // Title changes for other routes are handled by other components, since
        // we can access $tr messages only from within the component.
        if (title) {
          this.updateTabTitle(title);
        }
      },
    },
    $trs: {
      channelSets: 'Collections',
      catalog: 'Content Library',
      invitations: 'You have {count, plural,\n =1 {# invitation}\n other {# invitations}}',
      libraryTitle: 'Kolibri Content Library Catalog',
      frequentlyAskedQuestions: 'Frequently asked questions',
    },
  };

</script>


<style lang="scss">

  html {
    overflow-y: auto !important;

    .title,
    .headline,
    .display,
    .display-1,
    .subheading,
    .v-toolbar__title,
    .v-chip__content {
      font-family: 'Noto Sans' !important;
    }

    .v-btn--flat,
    .v-tabs__item {
      font-weight: bold;
      cursor: pointer;
    }
  }

  body * {
    font-family: 'Noto Sans';
    outline-color: var(--v-secondary-base);
  }

  .v-tooltip__content {
    max-width: 200px;
    text-align: center;
  }

  .main-container {
    overflow: auto;
  }

  .invitation-list {
    padding: 0;
  }

  .h-100 {
    height: 100%;
  }

</style>
