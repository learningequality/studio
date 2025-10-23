<template>

  <div
    class="my-channels"
    :class="{
      'window-small': windowIsSmall,
      'window-medium': windowIsMedium,
      'window-large': windowIsLarge,
      ['windowBreakpoint-' + windowBreakpoint]: windowBreakpoint,
    }"
  >
    <div class="new-channel">
      <KButton
        v-if="!loading"
        primary
        data-test="add-channel"
        :text="$tr('channel')"
        @click="newChannel"
      />
    </div>
    <div class="channels-body">
      <p
        v-if="!listChannels.length && !loading"
        class="no-channels"
      >
        {{ $tr('noChannelsFound') }}
      </p>
      <KCardGrid
        layout="1-1-1"
        :loading="loading"
        :skeletonsConfig="[
          {
            breakpoints: [0, 1, 2, 3, 4, 5, 6, 7],
            orientation: 'vertical',
            count: 3,
          },
        ]"
        class="cards"
      >
        <KCard
          v-for="(channel, index) in listChannels"
          :key="channel.id"
          :headingLevel="2"
          thumbnailDisplay="small"
          :thumbnailSrc="thumbnailSrc(channel)"
          :thumbnailAlign="'left'"
          :thumbnailScaleType="'contain'"
          :orientation="windowIsSmall ? 'vertical' : 'horizontal'"
          :title="channel.name"
          :titleMaxLines="2"
          :data-testid="`card-${index}`"
          @click="goToChannelRoute(channel)"
        >
          <template #thumbnailPlaceholder>
            <div
              class="img-placeholder-wrapper"
              :class="{
                'img-placeholder-wrapper-small': windowIsSmall,
                'img-placeholder-wrapper-medium': windowIsMedium,
                'img-placeholder-wrapper-large': windowIsLarge,
              }"
            >
              <KIcon
                :color="$themePalette.grey.v_400"
                class="img-placeholder-icon"
                icon="image"
              />
            </div>
          </template>
          <template #belowTitle>
            <div class="cards-below-title">
              <div class="cards-resource">
                <span> {{ $tr('resourceCount', { count: channel.count || 0 }) }} </span>
                <span>
                  {{ language(channel) }}
                </span>
              </div>
              <div
                class="cards-desc"
                :style="{ color: $themePalette.text }"
              >
                {{ channel.description }}
              </div>
            </div>
          </template>
          <template #footer>
            <div class="footer">
              <div class="footer-left">
                <span :style="{ color: $themeTokens.annotation }">
                  {{ getPublishStatus(channel) }}
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
                  <div
                    v-if="hasUnpublishedChanges(channel)"
                    class="last-updated"
                  >
                    <KIcon
                      :ref="`lastUpdatedTime-${index}`"
                      :color="$themePalette.green.v_600"
                      icon="dot"
                    />
                  </div>
                </div>
              </div>
              <div class="footer-right">
                <router-link
                  :data-testid="`details-button-${index}`"
                  :to="channelDetailsLink(channel)"
                  @click.native.stop
                >
                  <KIconButton
                    :color="$themeTokens.primary"
                    icon="info"
                    :tooltip="$tr('details')"
                  />
                </router-link>
                <ChannelStar
                  :channelId="channel.id"
                  :data-testid="`bookmark-button-${index}`"
                  :bookmark="channel.bookmark"
                />
                <KIconButton
                  size="small"
                  icon="optionsVertical"
                  appearance="flat-button"
                  :data-testid="`dropdown-button-${index}`"
                  @click.stop="openDropDown(channel, index)"
                >
                  <template #menu>
                    <KDropdownMenu
                      :hasIcons="true"
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

  export default {
    name: 'StudioMyChannels',
    components: {
      ChannelStar,
      ChannelTokenModal,
    },
    setup() {
      const { windowIsSmall, windowIsMedium, windowIsLarge, windowBreakpoint } =
        useKResponsiveWindow();
      return {
        windowIsSmall,
        windowIsMedium,
        windowIsLarge,
        windowBreakpoint,
      };
    },
    data() {
      return {
        loading: false,
        tokenDialog: false,
        deleteDialog: false,
        selectedChannel: {
          published: false,
        },
        dropDownArr: [],
      };
    },
    computed: {
      ...mapGetters('channel', ['channels']),
      listChannels() {
        const channels = this.channels;
        if (!channels) {
          return [];
        }
        const sortFields = ['modified'];
        const orderFields = ['desc'];
        const data = orderBy(
          this.channels.filter(channel => channel[ChannelListTypes.EDITABLE] && !channel.deleted),
          sortFields,
          orderFields,
        );
        return data;
      },

      // channel items properties
      canEdit() {
        return this.selectedChannel.edit;
      },
    },
    created() {
      this.loadData();
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
        this.$router.push(this.channelDetailsLink(channel));
      },
      loadData() {
        this.loading = true;
        this.loadChannelList({ listType: ChannelListTypes.EDITABLE })
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
      openDropDown(channel) {
        this.selectedChannel = channel;
        this.dropDownArr = this.dropDownItems(channel);
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
        return channel.thumbnail_encoding && channel.thumbnail_encoding.base64
          ? channel.thumbnail_encoding.base64
          : channel.thumbnail_url;
      },
      getPublishStatus(channel) {
        return channel.last_published
          ? this.$tr('lastPublished', {
            last_published: this.$formatRelative(channel.last_published, {
              now: new Date(),
            }),
          })
          : this.$tr('unpublishedText');
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

  .window-small {
    .channels-body,
    .new-channel {
      width: 100%;
    }
  }

  .window-medium {
    .channels-body,
    .new-channel {
      width: 100%;
      max-width: 83.33%;
    }
  }

  .window-large {
    .channels-body,
    .new-channel {
      width: 100%;
      max-width: 50%;
    }
  }

  .windowBreakpoint-3 {
    .channels-body,
    .new-channel {
      width: 100%;
      max-width: 83.33%;
    }
  }

  .windowBreakpoint-4 {
    .channels-body,
    .new-channel {
      width: 100%;
      max-width: 66.66%;
    }
  }

  .windowBreakpoint-5 {
    .channels-body,
    .new-channel {
      width: 100%;
      max-width: 50%;
    }
  }

  .my-channels {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: calc(100vh - 64px - 48px);
  }

  .no-channels {
    padding: 16px 0 0 16px;
    font-size: 24px;
  }

  .new-channel {
    display: flex;
    justify-content: end;
    margin-top: 20px;
  }

  .cards {
    margin-top: 16px;

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
  }

  .cards-below-title {
    font-size: 14px;
  }

  .cards-resource {
    span:first-child::after {
      margin: 0 8px;
      content: '•';
    }
  }

  .cards-desc {
    margin-top: 12px;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer-right,
  .footer-left,
  .last-updated {
    display: flex;
    align-items: center;
  }

  .footer-left {
    span {
      font-size: 14px;
    }

    div {
      margin-left: 8px;
    }
  }

  .img-placeholder-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .img-placeholder-wrapper-small {
    width: 42vw;
  }

  .img-placeholder-wrapper-medium {
    width: 33.33vw;
  }

  .img-placeholder-wrapper-large {
    width: 24vw;
  }

  .img-placeholder-icon {
    width: 50%;
    min-width: 24px;
    height: 50%;
  }

</style>
