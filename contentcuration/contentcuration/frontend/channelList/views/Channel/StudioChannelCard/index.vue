<template>

  <KCard
    :key="channel.id"
    class="channel"
    :headingLevel="headingLevel"
    data-testid="channel-card"
    thumbnailDisplay="small"
    thumbnailAlign="left"
    :orientation="cardOrientation"
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
          <span :style="{ color: $themeTokens.annotation }">
            {{ getPublishStatus }}
          </span>
          <div v-if="showUpdateStatus && hasUnpublishedChanges">
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
          <div
            v-if="showInfoButton"
            ref="infoBtn"
          >
            <router-link
              :aria-label="$tr('details')"
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
              reference="infoBtn"
              :refs="$refs"
              maxWidth="200px"
            >
              {{ $tr('details') }}
            </KTooltip>
          </div>

          <KIconButton
            v-if="showCopyButton"
            icon="copy"
            :tooltip="$tr('copyToken')"
            data-testid="copy-button"
            @click.stop.prevent="tokenDialog = true"
          />

          <ChannelStar
            v-if="showBookmarkButton"
            :channelId="channel.id"
            data-testid="bookmark-button"
            :bookmark="channel.bookmark"
          />

          <KIconButton
            v-if="showDropdown"
            size="small"
            icon="optionsVertical"
            appearance="flat-button"
            :ariaLabel="$tr('moreOptions')"
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
        :title="$tr('deleteTitle')"
        :submitText="$tr('deleteChannel')"
        :cancelText="$tr('cancel')"
        data-testid="delete-modal"
        appendToOverlay
        @submit="handleDelete"
        @cancel="deleteDialog = false"
      >
        {{ $tr('deletePrompt') }}
      </KModal>
      <KModal
        v-if="removeDialog"
        :title="$tr('removeTitle')"
        :submitText="$tr('removeBtn')"
        :cancelText="$tr('cancel')"
        data-testid="remove-modal"
        appendToOverlay
        @submit="handleRemove"
        @cancel="removeDialog = false"
      >
        {{ $tr('removePrompt') }}
      </KModal>
      <ChannelTokenModal
        v-if="showCopyButton || hasDropdownOption('copy')"
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
      orientation: {
        type: String,
        required: false,
        default: null,
        validator: value => ['vertical', 'horizontal'].includes(value),
      },
      channel: {
        type: Object,
        required: true,
      },
      showUpdateStatus: {
        type: Boolean,
        required: false,
        default: true,
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
      /**
       * Which buttons to show in the card footer.
       * Possible values:
       * - 'info' - Info button - navigate to the channel details page
       * - 'copy' - Copy token button
       * - 'bookmark' - Star button - (un)bookmark the channel
       */
      footerButtons: {
        type: Array,
        default: () => ['info'],
        validator: value => value.every(v => ['info', 'copy', 'bookmark'].includes(v)),
      },
      /**
       * Which items to include in the dropdown menu.
       * Possible values:
       * - 'edit' - 'Edit channel details' option
       * - 'copy' - 'Copy channel token' option
       * - 'source-url' - 'Go to source website' option
       * - 'demo-url' - 'View channel on Kolibri' option
       * - 'delete' - 'Delete channel' option
       * - 'remove' - 'Remove from channel list' option
       */
      dropdownOptions: {
        type: Array,
        default: () => [],
        validator: value =>
          value.every(v =>
            ['edit', 'copy', 'source-url', 'demo-url', 'delete', 'remove'].includes(v),
          ),
      },
    },
    data() {
      return {
        tokenDialog: false,
        deleteDialog: false,
        removeDialog: false,
        dropDownArr: [],
      };
    },
    computed: {
      cardOrientation() {
        if (this.orientation) {
          return this.orientation;
        }
        return this.windowIsSmall ? 'vertical' : 'horizontal';
      },
      linkComputedClass() {
        return this.$computedClass({
          ':hover': {
            backgroundColor: 'rgba(0,0,0,.1)',
          },
          ':focus': { ...this.$coreOutline, outlineOffset: 0 },
        });
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
      showInfoButton() {
        return this.footerButtons.includes('info');
      },
      showCopyButton() {
        return this.footerButtons.includes('copy');
      },
      showBookmarkButton() {
        return this.footerButtons.includes('bookmark');
      },
      showDropdown() {
        return this.dropdownOptions.length > 0;
      },
    },
    methods: {
      ...mapActions('channel', ['deleteChannel', 'removeViewer']),
      hasDropdownOption(option) {
        return this.dropdownOptions.includes(option);
      },
      onCardClick() {
        this.$emit('click');
      },
      openDropDown() {
        this.dropDownArr = this.dropDownItems();
      },
      dropDownItems() {
        const options = [];
        if (this.hasDropdownOption('edit')) {
          options.push({ label: this.$tr('editChannel'), icon: 'edit', value: 'edit' });
        }
        if (this.hasDropdownOption('copy')) {
          options.push({ label: this.$tr('copyToken'), icon: 'copy', value: 'copy' });
        }
        if (this.hasDropdownOption('source-url')) {
          options.push({ label: this.$tr('goToWebsite'), icon: 'openNewTab', value: 'source-url' });
        }
        if (this.hasDropdownOption('demo-url')) {
          options.push({ label: this.$tr('viewContent'), icon: 'openNewTab', value: 'demo-url' });
        }
        if (this.hasDropdownOption('delete')) {
          options.push({ label: this.$tr('deleteChannel'), icon: 'trash', value: 'delete' });
        }
        if (this.hasDropdownOption('remove')) {
          options.push({ label: this.$tr('removeChannel'), icon: 'trash', value: 'remove' });
        }
        return options;
      },
      selectedItem(option) {
        const value = option.value;
        if (value === 'edit') {
          this.goToChannelEdit();
        } else if (value === 'copy') {
          this.tokenDialog = true;
        } else if (value === 'delete') {
          this.deleteDialog = true;
        } else if (value === 'remove') {
          this.removeDialog = true;
        } else if (value === 'source-url') {
          window.open(this.channel.source_url, '_blank');
        } else if (value === 'demo-url') {
          window.open(this.channel.demo_server_url, '_blank');
        }
      },
      goToChannelEdit() {
        this.$router.push({
          name: RouteNames.CHANNEL_EDIT,
          query: {
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
        this.deleteChannel(this.channel.id).then(() => {
          this.deleteDialog = false;
          this.$store.dispatch('showSnackbarSimple', this.$tr('channelDeletedSnackbar'));
        });
      },
      handleRemove() {
        const currentUserId = this.$store.state.session.currentUser.id;
        this.removeViewer({ channelId: this.channel.id, userId: currentUserId }).then(() => {
          this.removeDialog = false;
          this.$store.dispatch('showSnackbarSimple', this.$tr('channelRemovedSnackbar'));
        });
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
      removeChannel: 'Remove channel',
      removeBtn: 'Remove',
      removeTitle: 'Remove from channel list',
      deletePrompt: 'This channel will be permanently deleted. This cannot be undone.',
      removePrompt:
        'You have view-only access to this channel. Confirm that you want to remove it from your list of channels.',
      channelDeletedSnackbar: 'Channel deleted',
      channelRemovedSnackbar: 'Channel removed',
      channelLanguageNotSetIndicator: 'No language set',
      moreOptions: 'More options',
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
