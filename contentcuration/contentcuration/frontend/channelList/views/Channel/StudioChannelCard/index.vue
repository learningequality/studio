<template>

  <KCard
    :key="channel.id"
    class="channel"
    :headingLevel="headingLevel"
    data-testid="channel-card"
    thumbnailDisplay="small"
    thumbnailAlign="left"
    :orientation="windowIsSmall ? 'vertical' : 'horizontal'"
    :title="channel.name"
    :titleMaxLines="2"
    @click="onCardClick"
  >
    <template
      v-if="selectable"
      #select
    >
      <KCheckbox
        :checked="selected"
        @change="$emit('toggle-selection', channel.id)"
      >
        <span class="visuallyhidden">{{ $tr('selectChannel', { name: channel.name }) }}</span>
      </KCheckbox>
    </template>

    <template #thumbnail>
      <KImg
        :src="thumbnailSrc"
        :style="{ width: '100%', height: '100%' }"
        scaleType="contain"
        aspectRatio="16:9"
        isDecorative
      >
        <template #placeholder>
          <span class="placeholder">
            <KIcon
              :color="$themePalette.grey.v_400"
              class="placeholder-icon"
              icon="image"
            />
          </span>
        </template>
      </KImg>
    </template>

    <template #belowTitle>
      <div class="below-title">
        <div class="resource">
          <span> {{ $tr('resourceCount', { count: channel.count || 0 }) }} </span>
          <span>
            {{ language }}
          </span>
        </div>
        <div
          class="desc"
          :style="{ color: $themeTokens.text }"
        >
          {{ channel.description }}
        </div>
      </div>
    </template>

    <template #footer>
      <div class="footer">
        <div class="footer-left">
          <span
            data-testid="publish-status"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ getPublishStatus }}
          </span>
          <div v-if="hasUnpublishedChanges">
            <KTooltip
              :reference="`lastUpdatedTime`"
              placement="bottom"
              :refs="$refs"
            >
              {{
                $tr('lastUpdated', {
                  updated: $formatRelative(channel.modified, { now: new Date() }),
                })
              }}
            </KTooltip>
            <div class="last-updated">
              <KIcon
                :ref="`lastUpdatedTime`"
                :color="$themePalette.green.v_600"
                icon="dot"
              />
            </div>
          </div>
        </div>
        <div class="footer-right">
          <div ref="detailIcon">
            <router-link
              data-testid="details-button"
              :to="channelDetailsLink"
              :class="['details-link', linkComputedClass]"
              @click.native.stop
            >
              <KIcon
                class="details-icon"
                :color="$themeTokens.primary"
                icon="info"
              />
            </router-link>
            <KTooltip
              reference="detailIcon"
              :refs="$refs"
              maxWidth="200px"
            >
              {{ $tr('details') }}
            </KTooltip>
          </div>

          <ChannelStar
            :channelId="channel.id"
            data-testid="bookmark-button"
            :bookmark="channel.bookmark"
          />
          <KIconButton
            size="small"
            icon="optionsVertical"
            appearance="flat-button"
            data-testid="dropdown-button"
            @click.stop="openDropDown"
          >
            <template #menu>
              <KDropdownMenu
                :hasIcons="true"
                :options="dropDownArr"
                @select="option => selectedItem(option)"
              />
            </template>
          </KIconButton>
        </div>
      </div>
      <KModal
        v-if="deleteDialog"
        :title="canEdit ? $tr('deleteTitle') : $tr('removeTitle')"
        :submitText="canEdit ? $tr('deleteChannel') : $tr('removeBtn')"
        :cancelText="$tr('cancel')"
        data-testid="delete-modal"
        appendToOverlay
        @submit="handleDelete"
        @cancel="deleteDialog = false"
      >
        {{ canEdit ? $tr('deletePrompt') : $tr('removePrompt') }}
      </KModal>
      <ChannelTokenModal
        v-if="channel && channel.published"
        v-model="tokenDialog"
        appendToOverlay
        data-testid="copy-modal"
        :channel="channel"
        @copied="trackTokenCopy"
      />
    </template>
  </KCard>

</template>


<script>

  import { mapActions } from 'vuex';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { RouteNames } from '../../../constants';
  import ChannelStar from '../ChannelStar';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import Languages from 'shared/leUtils/Languages';

  export default {
    name: 'StudioChannelCard',
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
      channel: {
        type: Object,
        required: true,
      },
      selectable: {
        type: Boolean,
        default: false,
      },
      selected: {
        type: Boolean,
        default: false,
      },
      headingLevel: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        tokenDialog: false,
        deleteDialog: false,
        dropDownArr: [],
      };
    },
    computed: {
      linkComputedClass() {
        return this.$computedClass({
          ':hover': {
            backgroundColor: 'rgba(0,0,0,.1)',
          },
          ':focus': { ...this.$coreOutline, outlineOffset: 0 },
        });
      },
      canEdit() {
        return this.channel.edit;
      },
      thumbnailSrc() {
        return this.channel.thumbnail_encoding && this.channel.thumbnail_encoding.base64
          ? this.channel.thumbnail_encoding.base64
          : this.channel.thumbnail_url;
      },
      getPublishStatus() {
        return this.channel.last_published
          ? this.$tr('lastPublished', {
            last_published: this.$formatRelative(this.channel.last_published, {
              now: new Date(),
            }),
          })
          : this.$tr('unpublishedText');
      },
      channelDetailsLink() {
        return {
          name: RouteNames.CHANNEL_DETAILS,
          query: {
            // this component is used on the catalog search
            // page => do not lose search query
            ...this.$route.query,
            last: this.$route.name,
          },
          params: {
            channelId: this.channel.id,
          },
        };
      },
      language() {
        const lang = Languages.get(this.channel.language);
        if (lang) {
          return lang.native_name;
        }
        return this.$tr('channelLanguageNotSetIndicator');
      },
      hasUnpublishedChanges() {
        return !this.channel.last_published || this.channel.modified > this.channel.last_published;
      },
    },
    methods: {
      ...mapActions('channel', ['deleteChannel', 'removeViewer']),
      onCardClick() {
        if (this.to) {
          this.$router.push(this.to);
        } else {
          window.location.href = window.Urls.channel(this.channel.id);
        }
      },
      openDropDown() {
        this.dropDownArr = this.dropDownItems();
      },
      dropDownItems() {
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
        if (!this.channel.published) {
          options = options.filter(item => item.value !== 'copy');
        }
        if (!this.channel.edit) {
          options = options.filter(item => item.value !== 'edit');
        }
        if (this.channel.source_url === '') {
          options = options.filter(item => item.value !== 'source-url');
        }
        if (this.channel.demo_server_url === '') {
          options = options.filter(item => item.value !== 'demo-url');
        }
        return options;
      },
      selectedItem(option) {
        const value = option.value;
        if (value === 'edit') {
          this.channelEditLink();
        } else if (value === 'copy') {
          this.tokenDialog = true;
        } else if (value === 'delete') {
          this.deleteDialog = true;
        } else if (value === 'source-url') {
          window.open(this.channel.source_url, '_blank');
        } else if (value === 'demo-url') {
          window.open(this.channel.demo_server_url, '_blank');
        }
      },
      channelEditLink() {
        this.$router.push({
          name: RouteNames.CHANNEL_EDIT,
          query: {
            // this component is used on the catalog search
            // page => do not lose search query
            ...this.$route.query,
            last: this.$route.name,
          },
          params: {
            channelId: this.channel.id,
            tab: 'edit',
          },
        });
      },
      handleDelete() {
        if (!this.canEdit) {
          const currentUserId = this.$store.state.session.currentUser.id;
          this.removeViewer({ channelId: this.channel.id, userId: currentUserId }).then(() => {
            this.deleteDialog = false;
            this.$store.dispatch('showSnackbarSimple', this.$tr('channelRemovedSnackbar'));
          });
        } else {
          this.deleteChannel(this.channel.id).then(() => {
            this.deleteDialog = false;
            this.$store.dispatch('showSnackbarSimple', this.$tr('channelDeletedSnackbar'));
          });
        }
      },
      trackTokenCopy() {
        this.$analytics.trackAction('channel_list', 'Copy token', {
          eventLabel: this.channel.primary_token,
        });
      },
    },
    $trs: {
      resourceCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
      unpublishedText: 'Unpublished',
      lastPublished: 'Published {last_published}',
      lastUpdated: 'Updated {updated}',
      details: 'Details',
      selectChannel: 'Select {name}',
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

  .channel {
    width: 100%;
  }

  .below-title {
    font-size: 14px;
  }

  .resource {
    span:first-child::after {
      margin: 0 8px;
      content: '•';
    }
  }

  .desc {
    margin-top: 12px;
  }

  .details-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
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

  .details-icon {
    width: 24px;
    height: 24px;
  }

  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .placeholder-icon {
    width: 50%;
    min-width: 24px;
    height: 50%;
  }

</style>
