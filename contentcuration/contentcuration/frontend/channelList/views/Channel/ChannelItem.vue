<template>

  <VCard
    class="channel my-3"
    :class="{ hideHighlight, added }"
    data-test="channel-card"
    tabindex="0"
    :href="linkToChannelTree ? channelHref : null"
    :to="linkToChannelTree ? null : channelDetailsLink"
    @click="goToChannelRoute"
  >
    <VLayout row wrap>
      <VFlex :class="{ xs12: fullWidth, sm12: !fullWidth, sm3: fullWidth }" md3 class="pa-3">
        <Thumbnail
          :src="channel.thumbnail_url"
          :encoding="channel.thumbnail_encoding"
        />
      </VFlex>
      <VFlex :class="{ xs12: fullWidth, sm12: !fullWidth, sm9: fullWidth }" md9>
        <VCardTitle>
          <VFlex xs12>
            <h3 class="card-header font-weight-bold notranslate" dir="auto">
              {{ channel.name }}
            </h3>
          </VFlex>
          <VFlex xs12>
            <VLayout class="grey--text metadata-section">
              <span class="metadata-field">
                {{ $tr('resourceCount', { 'count': channel.count || 0 }) }}
              </span>
              <span class="metadata-field">
                {{ language }}
              </span>
            </VLayout>
          </VFlex>
          <VFlex xs12 class="notranslate">
            <p dir="auto">
              {{ channel.description }}
            </p>
          </VFlex>
        </VCardTitle>
      </VFlex>
    </VLayout>
    <VCardActions>
      <VLayout align-center row wrap>
        <VFlex shrink>
          <!-- Some channels were published before the last_published field was added -->
          <VCardText v-if="channel.published" class="grey--text py-0">
            <span v-if="channel.last_published">
              {{ $tr(
                'lastPublished',
                {
                  'last_published': $formatRelative(
                    channel.last_published,
                    { now: new Date() }
                  )
                })
              }}
            </span>
          </VCardText>
          <VCardText v-else class="grey--text py-0">
            {{ $tr('unpublishedText') }}
          </VCardText>
        </VFlex>
        <VTooltip bottom>
          <template #activator="{ on }">
            <Icon
              v-if="allowEdit && hasUnpublishedChanges"
              color="greenSuccess"
              :size="12"
              v-on="on"
            >
              lens
            </Icon>
          </template>
          <span>
            {{ $tr(
              'lastUpdated',
              {
                'updated': $formatRelative(
                  channel.modified,
                  { now: new Date() }
                )
              })
            }}
          </span>
        </VTooltip>
        <VSpacer />
        <VFlex shrink>
          <router-link
            v-if="!libraryMode"
            :to="channelDetailsLink"
          >

            <IconButton
              :color="$themeTokens.primary"
              data-test="details-button"
              class="mr-1"
              icon="info"
              :text="$tr('details')"
              @mouseenter.native="hideHighlight = true"
              @mouseleave.native="hideHighlight = false"
            />

          </router-link>

          <IconButton
            v-if="!allowEdit && channel.published"
            class="mr-1"
            icon="copy"
            :text="$tr('copyToken')"
            data-test="token-button"
            @click.stop.prevent="tokenDialog = true"
            @mouseenter.native="hideHighlight = true"
            @mouseleave.native="hideHighlight = false"
          />
          <ChannelStar
            v-if="loggedIn"
            :channelId="channelId"
            :bookmark="channel.bookmark"
            class="mr-1"
            @mouseenter.native="hideHighlight = true"
            @mouseleave.native="hideHighlight = false"
          />
          <Menu v-if="showOptions">
            <template v-slot:activator="{ on }">
              <VBtn
                icon
                flat
                data-test="menu"
                v-on="on"
                @click.stop.prevent
                @mouseenter="hideHighlight = true"
                @mouseleave="hideHighlight = false"
              >
                <Icon>more_vert</Icon>
              </VBtn>
            </template>
            <VList>
              <VListTile
                v-if="canEdit"
                :to="channelEditLink"
                data-test="edit-channel"
                @click.stop
              >
                <VListTileAction>
                  <Icon>edit</Icon>
                </VListTileAction>
                <VListTileTitle>{{ $tr('editChannel') }}</VListTileTitle>
              </VListTile>
              <VListTile
                v-if="allowEdit && channel.published"
                data-test="token-listitem"
                @click="tokenDialog = true"
              >
                <VListTileAction>
                  <Icon>content_copy</Icon>
                </VListTileAction>
                <VListTileTitle>{{ $tr('copyToken') }}</VListTileTitle>
              </VListTile>
              <VListTile
                v-if="channel.source_url"
                :href="channel.source_url"
                target="_blank"
                @click.stop
              >
                <VListTileAction>
                  <Icon class="rtl-flip">
                    launch
                  </Icon>
                </VListTileAction>
                <VListTileTitle>{{ $tr('goToWebsite') }}</VListTileTitle>
              </VListTile>
              <VListTile
                v-if="channel.demo_server_url"
                :href="channel.demo_server_url"
                target="_blank"
              >
                <VListTileAction>
                  <Icon class="rtl-flip">
                    launch
                  </Icon>
                </VListTileAction>
                <VListTileTitle>{{ $tr('viewContent') }}</VListTileTitle>
              </VListTile>
              <VListTile
                v-if="allowEdit"
                data-test="delete-channel"
                @click.stop="deleteDialog = true"
              >
                <VListTileAction>
                  <Icon>delete</Icon>
                </VListTileAction>
                <VListTileTitle>{{ $tr('deleteChannel') }}</VListTileTitle>
              </VListTile>
            </VList>
          </Menu>
        </VFlex>
      </VLayout>
    </VCardActions>

    <!-- Delete dialog -->
    <PrimaryDialog v-model="deleteDialog" :title="$tr('deleteTitle')">
      {{ $tr('deletePrompt') }}
      <template v-slot:actions>
        <VSpacer />
        <VBtn color="primary" flat @click="deleteDialog = false">
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn color="primary" data-test="delete" @click="handleDelete">
          {{ $tr('deleteChannel') }}
        </VBtn>
      </template>
    </PrimaryDialog>

    <!-- Copy dialog -->
    <ChannelTokenModal
      v-if="channel && channel.published"
      v-model="tokenDialog"
      :channel="channel"
      @copied="trackTokenCopy"
    />
  </VCard>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouterNames } from '../../constants';
  import ChannelStar from './ChannelStar';
  import PrimaryDialog from 'shared/views/PrimaryDialog';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import Languages from 'shared/leUtils/Languages';
  import IconButton from 'shared/views/IconButton';

  export default {
    name: 'ChannelItem',
    components: {
      ChannelStar,
      PrimaryDialog,
      ChannelTokenModal,
      Thumbnail,
      IconButton,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
      detailsRouteName: {
        type: String,
        default: RouterNames.CHANNEL_DETAILS,
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
        hideHighlight: false,
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
          name: RouterNames.CHANNEL_EDIT,
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
          this.allowEdit ||
          this.channel.source_url ||
          this.channel.demo_server_url ||
          (this.channel.published && this.allowEdit)
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
      ...mapActions('channel', ['deleteChannel']),
      ...mapMutations('channel', { updateChannel: 'UPDATE_CHANNEL' }),
      handleDelete() {
        this.deleteChannel(this.channelId).then(() => {
          this.deleteDialog = false;
          this.$store.dispatch('showSnackbarSimple', this.$tr('channelDeletedSnackbar'));
        });
      },
      goToChannelRoute(e) {
        // preventDefault whenever we have clicked a button
        // that is a child of this card to avoid redirect
        // overriding the action of the clicked button
        if (this.hideHighlight) {
          e.preventDefault();
        } else {
          this.linkToChannelTree
            ? (window.location.href = this.channelHref)
            : this.$router.push(this.channelDetailsLink);
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
      viewContent: 'View channel on Kolibri',
      goToWebsite: 'Go to source website',
      editChannel: 'Edit channel details',
      copyToken: 'Copy channel token',
      deleteChannel: 'Delete channel',
      deleteTitle: 'Delete this channel',
      deletePrompt: 'This channel will be permanently deleted. This cannot be undone.',
      channelDeletedSnackbar: 'Channel deleted',
      channelLanguageNotSetIndicator: 'No language set',
      cancel: 'Cancel',
    },
  };

</script>

<style lang="less" scoped>

  .v-card {
    width: 100%;
    cursor: pointer;
    &:hover:not(.hideHighlight) {
      background-color: var(--v-greyBackground-base);
    }
    &.added {
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

  /deep/ .thumbnail {
    width: 100%;
  }

</style>
