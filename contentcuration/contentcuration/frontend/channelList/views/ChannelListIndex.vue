<template>

  <VApp>
    <VToolbar
      v-if="libraryMode"
      color="primary"
      dark
      :clipped-left="!isRTL"
      :clipped-right="isRTL"
      app
    >
      <VToolbarSideIcon :href="homeLink" exact>
        <VImg maxHeight="35" contain :src="require('shared/images/kolibri-logo.svg')" />
      </VToolbarSideIcon>

      <VToolbarTitle class="notranslate">
        {{ isFAQPage? $tr('frequentlyAskedQuestions') : $tr('libraryTitle') }}
      </VToolbarTitle>
    </VToolbar>
    <AppBar v-else>
      <template v-if="loggedIn" #tabs show-arrows>
        <VTab
          v-for="listType in lists"
          :key="listType.id"
          :to="getChannelLink(listType)"
        >
          <VBadge :value="invitationsByListCounts[listType]" color="secondary">
            <template v-slot:badge>
              <span>{{ $formatNumber(invitationsByListCounts[listType]) }}</span>
            </template>
            <span>
              <VIcon
                v-if="listType === 'bookmark'"
                style="margin-right: 8px;"
                class="notranslate"
              >
                star
              </VIcon>
              {{ $tr(listType) }}
            </span>
          </VBadge>
        </VTab>
        <VTab :to="catalogLink">
          {{ $tr("catalog") }}
        </VTab>
        <VTab :to="channelSetLink">
          {{ $tr("channelSets") }}
        </VTab>
      </template>
    </AppBar>
    <VContent>
      <VContainer fluid class="main-container">
        <VLayout row wrap justify-center>
          <VFlex xs12 sm10 md8 lg6>
            <VCard v-if="invitationList.length" v-show="isChannelList">
              <VList subheader>
                <VSubheader>{{ $tr('invitations', {count: invitationList.length}) }}</VSubheader>
                <ChannelInvitation
                  v-for="invitation in invitationList"
                  :key="invitation.id"
                  :invitationID="invitation.id"
                />
              </VList>
            </VCard>
          </VFlex>
        </VLayout>
        <keep-alive>
          <router-view :key="$route.name + $route.params.listType ? $route.params.listType : ''" />
        </keep-alive>
      </VContainer>
    </VContent>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { ListTypes, RouterNames, ChannelInvitationMapping } from '../constants';
  import ChannelInvitation from './Channel/ChannelInvitation';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import AppBar from 'shared/views/AppBar';

  const CATALOG_PAGES = [
    RouterNames.CATALOG_ITEMS,
    RouterNames.CATALOG_DETAILS,
    RouterNames.CATALOG_FAQ,
  ];

  export default {
    name: 'ChannelListIndex',
    components: {
      AppBar,
      ChannelInvitation,
      GlobalSnackbar,
    },
    computed: {
      ...mapState({
        loggedIn: state => state.session.loggedIn,
      }),
      isRTL() {
        return window.isRTL;
      },
      libraryMode() {
        return window.libraryMode;
      },
      isFAQPage() {
        return this.$route.name === RouterNames.CATALOG_FAQ;
      },
      ...mapGetters('channelList', ['invitations']),
      lists() {
        return Object.values(ListTypes).filter(l => l !== 'public');
      },
      invitationList() {
        return (
          this.invitations.filter(
            i => ChannelInvitationMapping[i.share_mode] === this.$route.params.listType
          ) || []
        );
      },
      invitationsByListCounts() {
        let inviteMap = {};
        Object.values(ListTypes).forEach(type => {
          inviteMap[type] = this.invitations.filter(
            i => !i.accepted && !i.declined && ChannelInvitationMapping[i.share_mode] === type
          ).length;
        });
        return inviteMap;
      },
      channelSetLink() {
        return { name: RouterNames.CHANNEL_SETS };
      },
      catalogLink() {
        return { name: RouterNames.CATALOG_ITEMS };
      },
      isChannelList() {
        return this.lists.includes(this.$route.params.listType);
      },
      homeLink() {
        return window.Urls.base();
      },
    },
    created() {
      if (this.loggedIn) {
        this.loadInvitationList();
      } else if (!CATALOG_PAGES.includes(this.$route.name)) {
        this.$router.push({
          name: RouterNames.CATALOG_ITEMS,
        });
      }
    },
    methods: {
      ...mapActions('channelList', ['loadInvitationList']),
      getChannelLink(listType) {
        const name = RouterNames.CHANNELS;
        return { name, params: { listType } };
      },
    },
    $trs: {
      [ListTypes.EDITABLE]: 'My Channels',
      [ListTypes.VIEW_ONLY]: 'View-Only',
      [ListTypes.PUBLIC]: 'Public',
      [ListTypes.STARRED]: 'Starred',
      channelSets: 'Collections',
      catalog: 'Public',
      invitations: 'You have {count, plural,\n =1 {# invitation}\n other {# invitations}}',
      libraryTitle: 'Kolibri Content Library Catalog',
      frequentlyAskedQuestions: 'Frequently asked questions',
    },
  };

</script>


<style lang="less">

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
  }

  .v-card {
    outline-color: #8dc5b6;
  }

  .v-tooltip__content {
    max-width: 200px;
    text-align: center;
  }

  .main-container {
    height: calc(100vh - 64px);
    overflow: auto;
  }

</style>
