<template>

  <StudioChannelsPage
    :loading="loading"
    :invitations="editInvitations"
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
        v-for="channel in editableChannels"
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
        editableChannels: channels,
      };
    },
    computed: {
      ...mapGetters('channelList', ['invitations']),
      editInvitations() {
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
      onCardClick(channel) {
        window.location.href = window.Urls.channel(channel.id);
      },
      getDropdownOptions(channel) {
        const options = ['edit', 'delete'];
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
