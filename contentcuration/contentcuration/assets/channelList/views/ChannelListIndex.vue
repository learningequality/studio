<template>
  <VApp>
    <AppBar>
      <template #tabs>
        <VTab
          v-for="listType in lists"
          :key="listType.id"
          :to="getChannelLink(listType)"
        >
          <span v-if="listType === 'STARRED'"></span>
          {{ $tr(listType) }}
        </VTab>
        <VTab
          :to="channelSetLink"
        >
          {{ $tr("channelSets") }}
        </VTab>
      </template>
    </AppBar>
    <VContent>
      <VContainer fluid>
        <ChannelInvitationList @setActiveList="setActiveList" />
        <router-view />
      </VContainer>
    </VContent>
  </VApp>
</template>


<script>

  import { mapState } from 'vuex';
  import { ListTypes, RouterNames } from '../constants';
  import { setChannelMixin } from '../mixins';
  import ChannelList from './Channel/ChannelList.vue';
  import ChannelSetList from './ChannelSet/ChannelSetList.vue';
  import ChannelInvitationList from './Channel/ChannelInvitationList.vue';
  import AppBar from 'shared/views/AppBar';

  export default {
    name: 'ChannelListIndex',
    $trs: {
      [ListTypes.EDITABLE]: 'My Channels',
      [ListTypes.VIEW_ONLY]: 'View-Only',
      [ListTypes.PUBLIC]: 'Public',
      [ListTypes.STARRED]: 'Starred',
      channelSets: 'Collections',
    },
    components: {
      AppBar,
      ChannelList,
      ChannelSetList,
      ChannelInvitationList,
    },
    mixins: [setChannelMixin],
    computed: {
      ...mapState('channelList', ['activeChannel']),
      lists() {
        return Object.values(ListTypes);
      },
      channelSetLink() {
        return { name: RouterNames.CHANNEL_SETS };
      },
    },
    watch: {
      $route() {
        this.setActiveChannelFromQuery();
      },
    },
    methods: {
      setActiveList(listType) {
        this.$router.push(this.getChannelLink(listType));
      },
      getChannelLink(listType) {
        const name = RouterNames.CHANNELS;
        return { name, params: { listType } };
      },
      setActiveChannelFromQuery() {
        const { channel_id } = this.$route.query;

        if (channel_id) {
          if (!this.activeChannel || this.activeChannel.id !== channel_id) {
            this.setChannel(channel_id);
          }
          // TODO revert query if there is no actual channel with the channel_id
        } else {
          // Need to infer whether we are creating a new channel or closing a page
          if (this.activeChannel && this.activeChannel.id === undefined) {
            // TODO figure out how to not call this twice when "+ Channel" is clicked
            this.setChannel('');
          } else {
            this.setChannel(null);
          }
        }
      },
    },
  };

</script>


<style lang="less" scoped>

</style>
