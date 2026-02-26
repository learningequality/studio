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

    <RemoveChannelFromListModal
      v-if="removeChannelId"
      :channelId="removeChannelId"
      @close="removeChannelId = null"
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
      @copied="trackTokenCopy(tokenChannel)"
    />
  </StudioChannelsPage>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { useChannelList } from '../../../composables/useChannelList';
  import { InvitationShareModes } from '../../../constants';
  import StudioChannelsPage from '../StudioChannelsPage';
  import StudioChannelCard from '../StudioChannelCard';
  import ChannelStar from '../ChannelStar';
  import RemoveChannelFromListModal from '../RemoveChannelFromListModal';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import { ChannelListTypes } from 'shared/constants';

  export default {
    name: 'StudioViewOnlyChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
      ChannelStar,
      RemoveChannelFromListModal,
      ChannelTokenModal,
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
    data() {
      return {
        removeChannelId: null,
        tokenChannelId: null,
      };
    },
    computed: {
      ...mapGetters('channelList', ['invitations']),
      viewOnlyInvitations() {
        return this.invitations.filter(i => i.share_mode === InvitationShareModes.VIEW_ONLY);
      },
      tokenChannel() {
        if (!this.tokenChannelId) return null;
        return this.viewOnlyChannels.find(c => c.id === this.tokenChannelId) || null;
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
      getDropdownItems(channel) {
        const items = [{ label: this.$tr('removeChannel'), icon: 'trash', value: 'remove' }];
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
        if (option.value === 'remove') {
          this.removeChannelId = channel.id;
        } else if (option.value === 'copy') {
          this.tokenChannelId = channel.id;
        } else if (option.value === 'source-url') {
          window.open(channel.source_url, '_blank');
        } else if (option.value === 'demo-url') {
          window.open(channel.demo_server_url, '_blank');
        }
      },
      trackTokenCopy(channel) {
        this.$analytics.trackAction('channel_list', 'Copy token', {
          eventLabel: channel.primary_token,
        });
      },
    },
    $trs: {
      title: 'View-only channels',
      moreOptions: 'More options',
      removeChannel: 'Remove channel',
      copyToken: 'Copy channel token',
      goToWebsite: 'Go to source website',
      viewContent: 'View channel on Kolibri',
    },
  };

</script>
