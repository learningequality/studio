<template>

  <VApp>
    <AppBar>
      <template v-if="loggedIn" #tabs show-arrows>
        <VTab
          v-for="listType in lists"
          :key="listType.id"
          :to="getChannelLink(listType)"
        >
          <span v-if="listType === 'STARRED'"></span>
          {{ $tr(listType) }}
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
      <VContainer fluid>
        <VCard v-if="invitations.length" v-show="isChannelList">
          <VList subheader>
            <VSubheader>{{ $tr('invitations', {count: invitations.length}) }}</VSubheader>
            <ChannelInvitation
              v-for="invitation in invitations"
              :key="invitation.id"
              :invitationID="invitation.id"
            />
          </VList>
        </VCard>
        <keep-alive>
          <router-view :key="$route.name" />
        </keep-alive>
      </VContainer>
    </VContent>
  </VApp>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { ListTypes, RouterNames } from '../constants';
  import ChannelInvitation from './Channel/ChannelInvitation';
  import AppBar from 'shared/views/AppBar';

  export default {
    name: 'ChannelListIndex',
    components: {
      AppBar,
      ChannelInvitation,
    },
    computed: {
      ...mapState({
        loggedIn: state => state.session.loggedIn,
      }),
      ...mapGetters('channelList', ['invitations']),
      lists() {
        return Object.values(ListTypes);
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
    },
    created() {
      if (this.loggedIn) {
        this.loadInvitationList();
      } else {
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

</style>
