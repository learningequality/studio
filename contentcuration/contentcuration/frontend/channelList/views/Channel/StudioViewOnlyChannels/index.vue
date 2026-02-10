<template>

  <StudioChannelsPage
    :loading="loading"
    :invitations="filteredInvitations"
  >
    <template #header>
      <h1 class="visuallyhidden">{{ $tr('title') }}</h1>
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
  import { InvitationShareModes } from '../../../constants';
  import StudioChannelsPage from '../StudioChannelsPage';
  import StudioChannelCard from '../StudioChannelCard';
  import { ChannelListTypes } from 'shared/constants';

  export default {
    name: 'StudioViewOnlyChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
    },
    setup() {
      const { loading, channels } = useChannelList({
        listType: ChannelListTypes.VIEW_ONLY,
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
        return this.invitations.filter(i => i.share_mode === InvitationShareModes.VIEW_ONLY);
      },
    },
    created() {
      this.loadInvitationList();
    },
    methods: {
      ...mapActions('channelList', ['loadInvitationList']),
    },
    $trs: {
      title: 'View-only channels',
    },
  };

</script>
