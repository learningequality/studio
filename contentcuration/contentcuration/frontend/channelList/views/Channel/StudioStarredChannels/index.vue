<template>

  <StudioChannelsPage :loading="loading">
    <template #header>
      <h1 class="visuallyhidden">{{ $tr('title') }}</h1>
    </template>

    <template #cards>
      <StudioChannelCard
        v-for="channel in bookmarkedChannels"
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
    />
  </StudioChannelsPage>

</template>


<script>

  import { useChannelList } from '../../../composables/useChannelList';
  import { RouteNames } from '../../../constants';
  import StudioChannelsPage from '../StudioChannelsPage';
  import StudioChannelCard from '../StudioChannelCard';
  import ChannelStar from '../ChannelStar';
  import DeleteChannelModal from '../DeleteChannelModal';
  import RemoveChannelFromListModal from '../RemoveChannelFromListModal';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import { ChannelListTypes } from 'shared/constants';

  export default {
    name: 'StudioStarredChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
      ChannelStar,
      DeleteChannelModal,
      RemoveChannelFromListModal,
      ChannelTokenModal,
    },
    setup() {
      const { loading, channels } = useChannelList({
        listType: ChannelListTypes.STARRED,
        sortFields: ['modified'],
        orderFields: ['desc'],
      });

      return {
        loading,
        bookmarkedChannels: channels,
      };
    },
    data() {
      return {
        deleteChannelId: null,
        removeChannelId: null,
        tokenChannelId: null,
      };
    },
    computed: {
      tokenChannel() {
        if (!this.tokenChannelId) return null;
        return this.bookmarkedChannels.find(c => c.id === this.tokenChannelId) || null;
      },
    },
    methods: {
      onCardClick(channel) {
        window.location.href = window.Urls.channel(channel.id);
      },
      getDropdownItems(channel) {
        const items = [];
        if (channel.edit) {
          items.push({ label: this.$tr('editChannel'), icon: 'edit', value: 'edit' });
          items.push({ label: this.$tr('deleteChannel'), icon: 'trash', value: 'delete' });
        } else {
          items.push({ label: this.$tr('removeChannel'), icon: 'trash', value: 'remove' });
        }
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
        } else if (option.value === 'remove') {
          this.removeChannelId = channel.id;
        } else if (option.value === 'source-url') {
          window.open(channel.source_url, '_blank');
        } else if (option.value === 'demo-url') {
          window.open(channel.demo_server_url, '_blank');
        }
      },
    },
    $trs: {
      title: 'Starred channels',
      moreOptions: 'More options',
      editChannel: 'Edit channel details',
      deleteChannel: 'Delete channel',
      removeChannel: 'Remove channel',
      copyToken: 'Copy channel token',
      goToWebsite: 'Go to source website',
      viewContent: 'View channel on Kolibri',
    },
  };

</script>
