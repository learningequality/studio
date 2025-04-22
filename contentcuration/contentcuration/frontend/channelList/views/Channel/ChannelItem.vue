<template>

  <div>
    <VCard
      class="channel my-3"
      hover
      :class="{ added }"
      data-test="channel-card"
      tabindex="0"
      :href="linkToChannelTree ? channelHref : null"
      :to="linkToChannelTree ? null : channelDetailsLink"
      @click="goToChannelRoute"
    >
      <VLayout
        row
        wrap
      >
        <VFlex
          :class="{ xs12: fullWidth, sm12: !fullWidth, sm3: fullWidth }"
          md3
          class="pa-3"
        >
          <Thumbnail
            :src="channel.thumbnail_url"
            :encoding="channel.thumbnail_encoding"
          />
        </VFlex>
        <VFlex
          :class="{ xs12: fullWidth, sm12: !fullWidth, sm9: fullWidth }"
          md9
        >
          <VCardTitle>
            <VFlex xs12>
              <h3
                class="card-header font-weight-bold notranslate"
                dir="auto"
              >
                {{ channel.name }}
              </h3>
            </VFlex>
            <VFlex xs12>
              <VLayout class="grey--text metadata-section">
                <span class="metadata-field">
                  {{ $tr('resourceCount', { count: channel.count || 0 }) }}
                </span>
                <span class="metadata-field">
                  {{ language }}
                </span>
              </VLayout>
            </VFlex>
            <VFlex
              xs12
              class="notranslate"
            >
              <p dir="auto">
                {{ channel.description }}
              </p>
            </VFlex>
          </VCardTitle>
        </VFlex>
      </VLayout>
      <VCardActions>
        <VLayout
          align-center
          row
          wrap
        >
          <VFlex shrink>
            <!-- Some channels were published before the last_published field was added -->
            <VCardText
              v-if="channel.published"
              class="grey--text py-0"
            >
              <span v-if="channel.last_published">
                {{
                  $tr('lastPublished', {
                    last_published: $formatRelative(channel.last_published, { now: new Date() }),
                  })
                }}
              </span>
            </VCardText>
            <VCardText
              v-else
              class="grey--text py-0"
            >
              {{ $tr('unpublishedText') }}
            </VCardText>
          </VFlex>
          <KTooltip
            reference="lastUpdatedTime"
            placement="bottom"
            :refs="$refs"
          >
            {{
              $tr('lastUpdated', {
                updated: $formatRelative(channel.modified, { now: new Date() }),
              })
            }}
          </KTooltip>
          <Icon
            v-if="allowEdit && hasUnpublishedChanges"
            ref="lastUpdatedTime"
            icon="unpublishedResource"
          />

          <VSpacer />
          <VFlex shrink>
            <KRouterLink
              v-if="!libraryMode"
              :to="channelDetailsLink"
            >
              <KIconButton
                v-if="loggedIn"
                :color="$themeTokens.primary"
                data-test="details-button"
                class="mr-1"
                icon="info"
                :tooltip="$tr('details')"
              />
            </KRouterLink>

            <KIconButton
              v-if="!allowEdit && channel.published"
              class="mr-1"
              icon="copy"
              :tooltip="$tr('copyToken')"
              data-test="token-button"
              @click.stop.prevent="tokenDialog = true"
            />
            <KIconButton
              v-if="!loggedIn && channel.published"
              class="mr-1"
              icon="openNewTab"
              :tooltip="$tr('viewOnKolibri')"
              data-test="view-on-kolibri"
              @click.stop.prevent="viewOnKolibri"
            />
            <ChannelStar
              v-if="loggedIn"
              :channelId="channelId"
              :bookmark="channel.bookmark"
              class="mr-1"
            />
            <BaseMenu v-if="showOptions">
              <template #activator="{ on }">
                <VBtn
                  icon
                  flat
                  data-test="menu"
                  v-on="on"
                  @click.stop.prevent
                >
                  <Icon icon="optionsVertical" />
                </VBtn>
              </template>
              <VList>
                <VListTile
                  v-if="canEdit"
                  :to="channelEditLink"
                  data-test="edit-channel"
                  @click.stop
                >
                  <VListTileAvatar>
                    <KIconButton
                      :disabled="true"
                      icon="edit"
                    />
                  </VListTileAvatar>
                  <VListTileTitle>{{ $tr('editChannel') }}</VListTileTitle>
                </VListTile>
                <VListTile
                  v-if="allowEdit && channel.published"
                  data-test="token-listitem"
                  @click.stop="tokenDialog = true"
                >
                  <VListTileAvatar>
                    <KIconButton
                      :disabled="true"
                      icon="copy"
                    />
                  </VListTileAvatar>
                  <VListTileTitle>{{ $tr('copyToken') }}</VListTileTitle>
                </VListTile>
                <VListTile
                  v-if="channel.source_url"
                  :href="channel.source_url"
                  target="_blank"
                  @click.stop
                >
                  <VListTileAvatar>
                    <Icon icon="openNewTab" />
                  </VListTileAvatar>
                  <VListTileTitle>{{ $tr('goToWebsite') }}</VListTileTitle>
                </VListTile>
                <VListTile
                  v-if="channel.demo_server_url"
                  :href="channel.demo_server_url"
                  target="_blank"
                >
                  <VListTileAvatar>
                    <Icon icon="openNewTab" />
                  </VListTileAvatar>
                  <VListTileTitle>{{ $tr('viewContent') }}</VListTileTitle>
                </VListTile>
                <VListTile
                  v-if="allowEdit"
                  data-test="delete-channel"
                  @click.stop="deleteDialog = true"
                >
                  <VListTileAvatar>
                    <KIconButton
                      :disabled="true"
                      icon="trash"
                    />
                  </VListTileAvatar>
                  <VListTileTitle>
                    {{ canEdit ? $tr('deleteChannel') : $tr('removeChannel') }}
                  </VListTileTitle>
                </VListTile>
              </VList>
            </BaseMenu>
          </VFlex>
        </VLayout>
      </VCardActions>
    </VCard>
    <!-- Delete dialog -->
    <KModal
      v-if="deleteDialog"
      :title="canEdit ? $tr('deleteTitle') : $tr('removeTitle')"
      :submitText="canEdit ? $tr('deleteChannel') : $tr('removeBtn')"
      :cancelText="$tr('cancel')"
      data-test="delete-modal"
      @submit="handleDelete"
      @cancel="deleteDialog = false"
    >
      {{ canEdit ? $tr('deletePrompt') : $tr('removePrompt') }}
    </KModal>
    <!-- Copy dialog -->
    <ChannelTokenModal
      v-if="channel && channel.published"
      v-model="tokenDialog"
      :channel="channel"
      @copied="trackTokenCopy"
    />
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouteNames } from '../../constants';
  import ChannelStar from './ChannelStar';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import Languages from 'shared/leUtils/Languages';

  export default {
    name: 'ChannelItem',
    components: {
      ChannelStar,
      ChannelTokenModal,
      Thumbnail,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
      detailsRouteName: {
        type: String,
        default: RouteNames.CHANNEL_DETAILS,
      },
      allowEdit: {
        type: Boolean,
        default: false,
      },
      fullWidth: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        deleteDialog: false,
        tokenDialog: false,
        added: false,
      };
    },
    computed: {
      ...mapGetters(['loggedIn']),
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      language() {
        const lang = Languages.get(this.channel.language);
        if (lang) {
          return lang.native_name;
        }
        return this.$tr('channelLanguageNotSetIndicator');
      },
      channelEditLink() {
        return {
          name: RouteNames.CHANNEL_EDIT,
          query: {
            // this component is used on the catalog search
            // page => do not lose search query
            ...this.$route.query,
            last: this.$route.name,
          },
          params: {
            channelId: this.channelId,
            tab: 'edit',
          },
        };
      },
      channelDetailsLink() {
        return {
          name: this.detailsRouteName,
          query: {
            // this component is used on the catalog search
            // page => do not lose search query
            ...this.$route.query,
            last: this.$route.name,
          },
          params: {
            channelId: this.channelId,
          },
        };
      },
      canEdit() {
        return this.allowEdit && this.channel.edit;
      },
      libraryMode() {
        return window.libraryMode;
      },
      showOptions() {
        return (
          this.loggedIn &&
          (this.allowEdit ||
            this.channel.source_url ||
            this.channel.demo_server_url ||
            (this.channel.published && this.allowEdit))
        );
      },
      linkToChannelTree() {
        return this.loggedIn && !this.libraryMode;
      },
      channelHref() {
        if (this.linkToChannelTree) {
          return window.Urls.channel(this.channelId);
        } else {
          return false;
        }
      },
      hasUnpublishedChanges() {
        return !this.channel.last_published || this.channel.modified > this.channel.last_published;
      },
    },
    mounted() {
      if (this.channel.added) {
        this.added = true;
        setTimeout(() => {
          this.updateChannel({ id: this.channel.id, added: false });
          this.added = false;
        }, 2500);
      }
    },
    methods: {
      ...mapActions('channel', ['deleteChannel', 'removeViewer']),
      ...mapMutations('channel', { updateChannel: 'UPDATE_CHANNEL' }),
      handleDelete() {
        if (!this.canEdit) {
          const currentUserId = this.$store.state.session.currentUser.id;
          this.removeViewer({ channelId: this.channelId, userId: currentUserId }).then(() => {
            this.deleteDialog = false;
            this.$store.dispatch('showSnackbarSimple', this.$tr('channelRemovedSnackbar'));
          });
        } else {
          this.deleteChannel(this.channelId).then(() => {
            this.deleteDialog = false;
            this.$store.dispatch('showSnackbarSimple', this.$tr('channelDeletedSnackbar'));
          });
        }
      },
      goToChannelRoute() {
        this.linkToChannelTree
          ? (window.location.href = this.channelHref)
          : this.$router.push(this.channelDetailsLink).catch(() => {});
      },
      trackTokenCopy() {
        this.$analytics.trackAction('channel_list', 'Copy token', {
          eventLabel: this.channel.primary_token,
        });
      },
      viewOnKolibri() {
        if (this.channel.demo_server_url) {
          window.open(this.channel.demo_server_url, '_blank');
        }
      },
    },
    $trs: {
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
      viewOnKolibri: 'View on Kolibri',
    },
  };

</script>


<style lang="scss" scoped>

  .v-card {
    width: 100%;
    cursor: pointer;

    &.added {
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-greenHighlightBackground-base);
    }
  }

  .card-header {
    font-size: 18px;
  }

  .metadata-section {
    // Double space metadata section
    line-height: 3;
  }

  .metadata-field {
    display: inline-block;

    &:not(:last-child)::after {
      margin: 0 8px;
      content: '•';
    }
  }

  ::v-deep .thumbnail {
    width: 100%;
  }

</style>
