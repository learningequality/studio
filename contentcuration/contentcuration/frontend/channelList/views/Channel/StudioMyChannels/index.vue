<template>

  <StudioChannelsPage :loading="loading">
    <template #header>
      <h1 class="visuallyhidden">{{ $tr('title') }}</h1>

      <StudioRaisedBox v-if="invitationList.length">
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
  import { RouteNames, ChannelInvitationMapping } from '../../../constants';
  import StudioChannelsPage from '../StudioChannelsPage';
  import StudioChannelCard from '../StudioChannelCard';
  import ChannelInvitation from '../ChannelInvitation';
  import { ChannelListTypes } from 'shared/constants';
  import StudioRaisedBox from 'shared/views/StudioRaisedBox';

  export default {
    name: 'StudioMyChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
      StudioRaisedBox,
      ChannelInvitation,
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
      invitationList() {
        const invitations = this.invitations;
        return invitations.filter(i => ChannelInvitationMapping[i.share_mode] === 'edit') || [];
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
      invitations: 'You have {count, plural,\n =1 {# invitation}\n other {# invitations}}',
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
