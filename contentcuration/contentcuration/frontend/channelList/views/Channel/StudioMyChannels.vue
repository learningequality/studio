<template>

  <div
    class="my-channels"
    :class="{ 'studio-channel': !windowIsSmall }"
  >
    <div class="my-channels__new-channel">
      <KButton
        v-if="isEditable && !loading"
        primary
        data-test="add-channel"
        :text="$tr('channel')"
        @click="newChannel"
      />
    </div>
    <div class="my-channels__body">
      <p
        v-if="listChannels && !listChannels.length"
        class="my-channels__body--no-channels"
      >
        {{ $tr('noChannelsFound') }}
      </p>
      <KCardGrid
        layout="1-1-1"
        :loading="loading"
        class="my-channels__cards"
      >
        <KCard
          v-for="(channel, index) in listChannels"
          :key="channel.id"
          :headingLevel="2"
          thumbnailDisplay="small"
          :thumbnailSrc="thumbnailSrc(channel)"
          :thumbnailAlign="'left'"
          :thumbnailScaleType="'fitXY'"
          :orientation="windowIsSmall ? 'vertical' : 'horizontal'"
          :title="channel.name"
          :titleMaxLines="2"
          :data-testid="`card-${index}`"
          @click="goToChannelRoute(channel)"
        >
          <template #belowTitle>
            <div class="my-channels__cards--below-title">
              <div class="my-channels__cards--below-title__resource">
                <span> {{ $tr('resourceCount', { count: channel.count || 0 }) }} </span>
                <span>
                  {{ language(channel) }}
                </span>
              </div>
              <div class="my-channels__cards--below-title__desc">{{ channel.description }}</div>
            </div>
          </template>
          <template #footer>
            <div class="my-channels__cards--footer">
              <div class="my-channels__cards--footer__left">
                <span v-if="channel.last_published">
                  {{
                    $tr('lastPublished', {
                      last_published: $formatRelative(channel.last_published, { now: new Date() }),
                    })
                  }}
                </span>
                <span v-else>
                  {{ $tr('unpublishedText') }}
                </span>
                <div>
                  <KTooltip
                    :reference="`lastUpdatedTime-${index}`"
                    placement="bottom"
                    :refs="$refs"
                  >
                    {{
                      $tr('lastUpdated', {
                        updated: $formatRelative(channel.modified, { now: new Date() }),
                      })
                    }}
                  </KTooltip>
                  <KIcon
                    v-if="hasUnpublishedChanges(channel)"
                    :ref="`lastUpdatedTime-${index}`"
                    :color="$themePalette.green.v_600"
                    icon="dot"
                  />
                </div>
              </div>
              <div class="my-channels__cards--footer__right">
                <KRouterLink
                  v-if="!libraryMode"
                  :data-testid="`details-button-${index}`"
                  :to="channelDetailsLink(channel)"
                >
                  <KIconButton
                    :color="$themeTokens.primary"
                    icon="info"
                    :tooltip="$tr('details')"
                    @click.stop
                  />
                </KRouterLink>
                <ChannelStar
                  v-if="loggedIn"
                  :channelId="channel.id"
                  :data-testid="`bookmark-button-${index}`"
                  :bookmark="channel.bookmark"
                />
                <KIconButton
                  size="small"
                  icon="optionsVertical"
                  appearance="flat-button"
                  :data-testid="`dropdown-button-${index}`"
                  @click="openDropDown(channel, index)"
                  @click.stop
                >
                  <template #menu>
                    <KDropdownMenu
                      :hasIcons="true"
                      :isContextMenu="isContextMenu[index]"
                      :options="dropDownArr"
                      @select="option => selectedItem(option, channel)"
                    />
                  </template>
                </KIconButton>
              </div>
            </div>
          </template>
        </KCard>
      </KCardGrid>
    </div>
    <KModal
      v-if="deleteDialog"
      :title="canEdit ? $tr('deleteTitle') : $tr('removeTitle')"
      :submitText="canEdit ? $tr('deleteChannel') : $tr('removeBtn')"
      :cancelText="$tr('cancel')"
      data-testid="delete-modal"
      @submit="handleDelete"
      @cancel="deleteDialog = false"
    >
      {{ canEdit ? $tr('deletePrompt') : $tr('removePrompt') }}
    </KModal>
    <ChannelTokenModal
      v-if="selectedChannel && selectedChannel.published"
      v-model="tokenDialog"
      data-testid="copy-modal"
      :channel="selectedChannel"
      @copied="trackTokenCopy"
    />
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import orderBy from 'lodash/orderBy';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { RouteNames } from '../../constants';
  import ChannelStar from './ChannelStar';
  import { ChannelListTypes } from 'shared/constants';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import Languages from 'shared/leUtils/Languages';

  function listTypeValidator(value) {
    // The value must match one of the ListTypes
    return Object.values(ChannelListTypes).includes(value);
  }

  export default {
    name: 'StudioMyChannels',
    components: {
      ChannelStar,
      ChannelTokenModal,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      listType: {
        type: String,
        required: true,
        validator: listTypeValidator,
      },
    },
    data() {
      return {
        loading: false,
        tokenDialog: false,
        deleteDialog: false,
        selectedChannel: {
          published: false,
        },
        isContextMenu: [],
        dropDownArr: [],
      };
    },
    computed: {
      ...mapGetters(['loggedIn']),
      ...mapGetters('channel', ['channels']),
      libraryMode() {
        return window.libraryMode;
      },
      listChannels() {
        const channels = this.channels;
        if (!channels) {
          return [];
        }
        const sortFields = ['modified'];
        const orderFields = ['desc'];
        if (this.listType === ChannelListTypes.PUBLIC) {
          sortFields.unshift('priority');
          orderFields.unshift('desc');
        }
        const data = orderBy(
          this.channels.filter(channel => channel[this.listType] && !channel.deleted),
          sortFields,
          orderFields,
        );
        this.isContextMenu.fill(false, 0, data.length);
        return data;
      },
      isEditable() {
        return this.listType === ChannelListTypes.EDITABLE;
      },

      // channel items properties
      canEdit() {
        return this.selectedChannel.edit;
      },
      linkToChannelTree() {
        return this.loggedIn && !this.libraryMode;
      },
    },
    watch: {
      listType(newListType) {
        this.loadData(newListType);
      },
      $route(to, from) {
        if (to.query.page !== from.query.page) {
          this.loadData(this.listType);
        }
      },
    },
    created() {
      this.loadData(this.listType);
    },
    methods: {
      ...mapActions('channel', ['loadChannelList', 'deleteChannel', 'removeViewer']),
      language(channel) {
        const lang = Languages.get(channel.language);
        if (lang) {
          return lang.native_name;
        }
        return this.$tr('channelLanguageNotSetIndicator');
      },
      newChannel() {
        this.$analytics.trackClick('channel_list', 'Create channel');
        this.$router.push({
          name: RouteNames.NEW_CHANNEL,
          query: { last: this.$route.name },
        });
      },
      goToChannelRoute(channel) {
        this.linkToChannelTree
          ? (window.location.href = this.channelHref(channel.id))
          : this.$router.push(this.channelDetailsLink).catch(() => {});
      },
      channelHref(id) {
        if (this.linkToChannelTree) {
          return window.Urls.channel(id);
        } else {
          return false;
        }
      },
      loadData(listType) {
        this.loading = true;
        this.loadChannelList({ listType })
          .then(() => {
            this.loading = false;
          })
          .catch(() => {
            this.loading = false;
          });
      },

      hasUnpublishedChanges(channel) {
        return !channel.last_published || channel.modified > channel.last_published;
      },
      trackTokenCopy() {
        this.$analytics.trackAction('channel_list', 'Copy token', {
          eventLabel: this.selectedChannel.primary_token,
        });
      },
      channelDetailsLink(channel) {
        return {
          name: RouteNames.CHANNEL_DETAILS,
          query: {
            // this component is used on the catalog search
            // page => do not lose search query
            ...this.$route.query,
            last: this.$route.name,
          },
          params: {
            channelId: channel.id,
          },
        };
      },
      openDropDown(channel, index) {
        this.selectedChannel = channel;
        this.isContextMenu[index] = !this.isContextMenu[index];
        this.dropDownArr = this.dropDownItems(channel)
      },
      dropDownItems(channel) {
        this.selectedChannel = channel;
        let options = [
          {
            label: this.$tr('editChannel'),
            icon: 'edit',
            value: 'edit',
          },
          {
            label: this.$tr('copyToken'),
            icon: 'copy',
            value: 'copy',
          },
          {
            label: this.$tr('goToWebsite'),
            icon: 'openNewTab',
            value: 'source-url',
          },
          {
            label: this.$tr('viewContent'),
            icon: 'openNewTab',
            value: 'demo-url',
          },
          {
            label: this.canEdit ? this.$tr('deleteChannel') : this.$tr('removeChannel'),
            icon: 'trash',
            value: 'delete',
          },
        ];
        if (!channel.published) {
          options = options.filter(item => item.value !== 'copy');
        }
        if (channel.source_url === '') {
          options = options.filter(item => item.value !== 'source-url');
        }
        if (channel.demo_server_url === '') {
          options = options.filter(item => item.value !== 'demo-url');
        }
        return options;
      },
      selectedItem(option, channel) {
        const value = option.value;
        this.selectedChannel = channel;
        if (value === 'edit') {
          this.channelEditLink(channel);
        } else if (value === 'copy') {
          this.tokenDialog = true;
        } else if (value === 'delete') {
          this.deleteDialog = true;
        } else if (value === 'source-url') {
          window.open(channel.source_url, '_blank');
        } else if (value === 'demo-url') {
          window.open(channel.demo_server_url, '_blank');
        }
      },
      channelEditLink(channel) {
        this.$router.push({
          name: RouteNames.CHANNEL_EDIT,
          query: {
            // this component is used on the catalog search
            // page => do not lose search query
            ...this.$route.query,
            last: this.$route.name,
          },
          params: {
            channelId: channel.id,
            tab: 'edit',
          },
        });
      },
      handleDelete() {
        if (!this.canEdit) {
          const currentUserId = this.$store.state.session.currentUser.id;
          this.removeViewer({ channelId: this.selectedChannel.id, userId: currentUserId }).then(
            () => {
              this.deleteDialog = false;
              this.$store.dispatch('showSnackbarSimple', this.$tr('channelRemovedSnackbar'));
            },
          );
        } else {
          this.deleteChannel(this.selectedChannel.id).then(() => {
            this.deleteDialog = false;
            this.$store.dispatch('showSnackbarSimple', this.$tr('channelDeletedSnackbar'));
          });
        }
      },
      thumbnailSrc(channel) {
        return channel.thumbnail_encoding && channel.thumbnail_encoding.base64 ? channel.thumbnail_encoding.base64 : channel.thumbnail_url;
      },
    },
    $trs: {
      channel: 'New channel',
      noChannelsFound: 'No channels found',
      resourceCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
      unpublishedText: 'Unpublished',
      lastPublished: 'Published {last_published}',
      lastUpdated: 'Updated {updated}',
      details: 'Details',
      viewContent: 'View channel on Kolibri',
      goToWebsite: 'Go to source website',
      editChannel: 'Edit channel details',
      copyToken: 'Copy channel token',
      deleteChannel: 'Delete channel',
      deleteTitle: 'Delete this channel',
      removeChannel: 'Remove from channel list',
      removeBtn: 'Remove',
      removeTitle: 'Remove from channel list',
      deletePrompt: 'This channel will be permanently deleted. This cannot be undone.',
      removePrompt:
        'You have view-only access to this channel. Confirm that you want to remove it from your list of channels.',
      channelDeletedSnackbar: 'Channel deleted',
      channelRemovedSnackbar: 'Channel removed',
      channelLanguageNotSetIndicator: 'No language set',
      cancel: 'Cancel',
    },
  };

</script>


<style lang="scss" scoped>

  .studio-channel {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: calc(100vh - 64px - 48px); /* full height minus bottom bar and top bar */
    .my-channels {
      &__body,
      &__new-channel {
        width: 50%;
      }
    }
  }

  .my-channels {
    &__body {
      &--no-channels {
        padding: 16px 0 0 16px;
        font-size: 24px;
      }
    }

    &__new-channel {
      display: flex;
      justify-content: end;
    }

    &__cards {
      margin-top: 16px;

      &--below-title {
        font-size: 14px;

        &__resource {
          span:first-child::after {
            margin: 0 8px;
            content: '•';
          }
        }

        &__desc {
          margin-top: 4px;
          color: #000000;
        }
      }

      &--footer {
        display: flex;
        align-items: center;
        justify-content: space-between;

        &__right,
        &__left {
          display: flex;
          align-items: center;
        }

        &__left {
          span {
            font-size: 14px;
            color: #666666;
          }

          div {
            margin-left: 8px;
          }

          [dir='rtl'] & div {
            margin-right: 8px;
          }
        }
      }

      /* check this below class, this should be coming form KDS */
      ::v-deep .visuallyhidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        border: 0;
      }

      [dir='rtl'] & {
        ::v-deep .k-thumbnail {
          margin-right: 16px;
        }
      }
    }
  }

  .icon-wrapper {
    ::v-deep button {
      width: 18px;
      height: 18px;
    }
  }

</style>
