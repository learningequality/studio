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
        @click="onCardClick(channel)"
      >
        <template #footerActions>
          <ChannelStar
            :channelId="channel.id"
            :bookmark="channel.bookmark"
          />

          <KIconButton
            size="small"
            icon="optionsVertical"
            appearance="flat-button"
            :ariaLabel="$tr('moreOptions')"
            @click.stop
          >
            <template #menu>
              <KDropdownMenu
                :hasIcons="true"
                :options="getDropdownItems(channel)"
                @select="option => handleDropdownSelect(option, channel)"
              />
            </template>
          </KIconButton>
        </template>
      </StudioChannelCard>
    </template>

    <DeleteChannelModal
      v-if="deleteChannelId"
      :channelId="deleteChannelId"
      @close="deleteChannelId = null"
    />

    <ChannelTokenModal
      :value="Boolean(tokenChannel)"
      appendToOverlay
      data-testid="copy-modal"
      :channel="tokenChannel"
      @input="
        val => {
          if (!val) tokenChannelId = null;
        }
      "
    />
  </StudioChannelsPage>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { useChannelList } from '../../../composables/useChannelList';
  import { RouteNames, InvitationShareModes } from '../../../constants';
  import StudioChannelsPage from '../StudioChannelsPage';
  import StudioChannelCard from '../StudioChannelCard';
  import ChannelStar from '../ChannelStar';
  import DeleteChannelModal from '../DeleteChannelModal';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import { ChannelListTypes } from 'shared/constants';

  export default {
    name: 'StudioMyChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
      ChannelStar,
      DeleteChannelModal,
      ChannelTokenModal,
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
    data() {
      return {
        deleteChannelId: null,
        tokenChannelId: null,
      };
    },
    computed: {
      ...mapGetters('channelList', ['invitations']),
      editInvitations() {
        return this.invitations.filter(i => i.share_mode === InvitationShareModes.EDIT);
      },
      tokenChannel() {
        if (!this.tokenChannelId) return null;
        return this.editableChannels.find(c => c.id === this.tokenChannelId) || null;
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
      getDropdownItems(channel) {
        const items = [
          { label: this.$tr('editChannel'), icon: 'edit', value: 'edit' },
          { label: this.$tr('deleteChannel'), icon: 'trash', value: 'delete' },
        ];
        if (channel.published) {
          items.push({ label: this.$tr('copyToken'), icon: 'copy', value: 'copy' });
        }
        if (channel.source_url) {
          items.push({ label: this.$tr('goToWebsite'), icon: 'openNewTab', value: 'source-url' });
        }
        if (channel.demo_server_url) {
          items.push({ label: this.$tr('viewContent'), icon: 'openNewTab', value: 'demo-url' });
        }
        return items;
      },
      handleDropdownSelect(option, channel) {
        if (option.value === 'edit') {
          this.$router.push({
            name: RouteNames.CHANNEL_EDIT,
            query: { ...this.$route.query, last: this.$route.name },
            params: { channelId: channel.id, tab: 'edit' },
          });
        } else if (option.value === 'copy') {
          this.tokenChannelId = channel.id;
        } else if (option.value === 'delete') {
          this.deleteChannelId = channel.id;
        } else if (option.value === 'source-url') {
          window.open(channel.source_url, '_blank');
        } else if (option.value === 'demo-url') {
          window.open(channel.demo_server_url, '_blank');
        }
      },
    },
    $trs: {
      newChannel: 'New channel',
      title: 'My channels',
      moreOptions: 'More options',
      editChannel: 'Edit channel details',
      deleteChannel: 'Delete channel',
      copyToken: 'Copy channel token',
      goToWebsite: 'Go to source website',
      viewContent: 'View channel on Kolibri',
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
