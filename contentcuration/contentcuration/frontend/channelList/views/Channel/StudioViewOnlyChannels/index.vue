<template>

  <StudioChannelsPage
    :loading="loading"
    :invitations="viewOnlyInvitations"
  >
    <template #header>
      <h1 class="visuallyhidden">{{ $tr('title') }}</h1>
    </template>

    <template #cards>
      <StudioChannelCard
        v-for="channel in viewOnlyChannels"
        :key="channel.id"
        :headingLevel="2"
        :channel="channel"
        :footerButtons="['info', 'bookmark']"
        :dropdownOptions="getDropdownOptions(channel)"
        @click="onCardClick(channel)"
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
        viewOnlyChannels: channels,
      };
    },
    computed: {
      ...mapGetters('channelList', ['invitations']),
      viewOnlyInvitations() {
        return this.invitations.filter(i => i.share_mode === InvitationShareModes.VIEW_ONLY);
      },
    },
    created() {
      this.loadInvitationList();
    },
    methods: {
      ...mapActions('channelList', ['loadInvitationList']),
      onCardClick(channel) {
        window.location.href = window.Urls.channel(channel.id);
      },
      getDropdownOptions(channel) {
        const options = ['remove'];
        if (channel.published) {
          options.push('copy');
        }
        if (channel.source_url) {
          options.push('source-url');
        }
        if (channel.demo_server_url) {
          options.push('demo-url');
        }
        return options;
      },
    },
    $trs: {
      title: 'View-only channels',
    },
  };

</script>
