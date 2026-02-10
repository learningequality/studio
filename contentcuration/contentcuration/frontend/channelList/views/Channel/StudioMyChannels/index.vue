<template>

  <StudioChannelsPage
    :loading="loading"
    :invitations="filteredInvitations"
  >
    <template #header>
      <h1 class="visuallyhidden">{{ $tr('title') }}</h1>

      <div
        v-if="!loading"
        class="button-container"
      >
        <KButton
          primary
          :text="$tr('newChannel')"
          @click="newChannel"
        />
      </div>
    </template>

    <template #cards>
      <StudioChannelCard
        v-for="channel in channels"
        :key="channel.id"
        :headingLevel="2"
        :channel="channel"
      />
    </template>
  </StudioChannelsPage>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { useChannelList } from '../../../composables/useChannelList';
  import { RouteNames, InvitationShareModes } from '../../../constants';
  import StudioChannelsPage from '../StudioChannelsPage';
  import StudioChannelCard from '../StudioChannelCard';
  import { ChannelListTypes } from 'shared/constants';

  export default {
    name: 'StudioMyChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
    },
    setup() {
      const { loading, channels } = useChannelList({
        listType: ChannelListTypes.EDITABLE,
        sortFields: ['modified'],
        orderFields: ['desc'],
      });

      return {
        loading,
        channels,
      };
    },
    computed: {
      ...mapGetters('channelList', ['invitations']),
      filteredInvitations() {
        return this.invitations.filter(i => i.share_mode === InvitationShareModes.EDIT);
      },
    },
    created() {
      this.loadInvitationList();
    },
    methods: {
      ...mapActions('channelList', ['loadInvitationList']),
      newChannel() {
        this.$analytics.trackClick('channel_list', 'Create channel');
        this.$router.push({
          name: RouteNames.NEW_CHANNEL,
          query: { last: this.$route.name },
        });
      },
    },
    $trs: {
      newChannel: 'New channel',
      title: 'My channels',
    },
  };

</script>


<style lang="scss" scoped>

  .button-container {
    display: flex;
    justify-content: end;
    width: 100%;
    margin-top: 20px;
  }

</style>
