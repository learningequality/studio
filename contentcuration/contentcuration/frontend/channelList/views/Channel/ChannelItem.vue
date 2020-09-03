<template>

  <VCard
    class="my-3 channel"
    :class="{hideHighlight}"
    data-test="channel-card"
    tabindex="0"
    @click="openChannelLink"
    @keyup.enter="openChannelLink"
  >
    <VLayout row wrap>
      <VFlex :class="{xs12: fullWidth, sm12: !fullWidth, sm3: fullWidth}" md3 class="pa-3">
        <Thumbnail
          :src="channel.thumbnail_url"
          :encoding="channel.thumbnail_encoding"
        />
      </VFlex>
      <VFlex :class="{xs12: fullWidth, sm12: !fullWidth, sm9: fullWidth}" md9>
        <VCardTitle>
          <VFlex xs12>
            <h3 class="headline notranslate font-weight-bold" dir="auto">
              {{ channel.name }}
            </h3>
          </VFlex>
          <VFlex xs12>
            <VLayout class="grey--text metadata" justify-space-between>
              <VFlex sm6 md4>
                <span v-if="language">
                  {{ language.native_name }}
                </span>
                <span v-else>
                  {{ $tr('channelLanguageNotSetIndicator') }}
                </span>
              </VFlex>
              <VFlex sm6 md4>
                {{ $tr('resourceCount', {'count': channel.count || 0}) }}
              </VFlex>
              <VFlex v-if="$vuetify.breakpoint.smAndUp" sm4 />
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
        <VFlex>
          <!-- Some channels were published before the last_published field was added -->
          <VCardText v-if="channel.published" class="grey--text">
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
          <VCardText v-else class="font-italic grey--text">
            {{ $tr('unpublishedText') }}
          </VCardText>
        </VFlex>
        <VSpacer />
        <VFlex shrink>
          <IconButton
            v-if="!libraryMode"
            color="primary"
            :to="channelDetailsLink"
            data-test="details-button"
            class="mr-1"
            icon="info"
            :text="$tr('details')"
            @mouseenter="hideHighlight = true"
            @mouseleave="hideHighlight = false"
          />
          <IconButton
            v-if="!allowEdit && channel.published"
            class="mr-1"
            icon="content_copy"
            :text="$tr('copyToken')"
            data-test="token-button"
            @click="tokenDialog=true"
            @mouseenter="hideHighlight = true"
            @mouseleave="hideHighlight = false"
          />
          <ChannelStar
            v-if="loggedIn"
            :channelId="channelId"
            :bookmark="channel.bookmark"
            class="mr-1"
            @mouseenter="hideHighlight = true"
            @mouseleave="hideHighlight = false"
          />
          <VMenu v-if="showOptions" offset-y>
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
                @click="tokenDialog=true"
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
                  <Icon>launch</Icon>
                </VListTileAction>
                <VListTileTitle>{{ $tr('goToWebsite') }}</VListTileTitle>
              </VListTile>
              <VListTile
                v-if="channel.demo_server_url"
                :href="channel.demo_server_url"
                target="_blank"
              >
                <VListTileAction>
                  <Icon>devices</Icon>
                </VListTileAction>
                <VListTileTitle>{{ $tr('viewContent') }}</VListTileTitle>
              </VListTile>
              <VListTile
                v-if="allowEdit"
                data-test="delete-channel"
                @click.stop="deleteDialog=true"
              >
                <VListTileAction>
                  <Icon>delete</Icon>
                </VListTileAction>
                <VListTileTitle>{{ $tr('deleteChannel') }}</VListTileTitle>
              </VListTile>
            </VList>
          </VMenu>
        </VFlex>
      </VLayout>
    </VCardActions>

    <!-- Delete dialog -->
    <PrimaryDialog v-model="deleteDialog" :title="$tr('deleteTitle')">
      {{ $tr('deletePrompt') }}
      <template v-slot:actions>
        <VSpacer />
        <VBtn color="primary" flat @click="deleteDialog=false">
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
    />
  </VCard>

</template>

<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
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
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      ...mapState({
        loggedIn: state => state.session.loggedIn,
      }),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      language() {
        return Languages.get(this.channel.language);
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
    },
    methods: {
      ...mapActions('channel', ['deleteChannel']),
      handleDelete() {
        this.deleteChannel(this.channelId).then(() => {
          this.deleteDialog = false;
        });
      },
      openChannelLink() {
        // TODO: if we decide to make channel edit page accessible
        // without an account, update this to be a :to computed property
        // to take advantage of the router more
        if (this.loggedIn && !this.libraryMode) {
          window.location = window.Urls.channel(this.channelId);
        } else {
          this.$router.push(this.channelDetailsLink);
        }
      },
    },
    $trs: {
      resourceCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
      unpublishedText: 'Unpublished',
      lastPublished: 'Published {last_published}',
      details: 'Details',
      viewContent: 'View channel on Kolibri',
      goToWebsite: 'Go to source website',
      editChannel: 'Edit channel details',
      copyToken: 'Copy channel token',
      deleteChannel: 'Delete channel',
      deleteTitle: 'Delete this channel',
      deletePrompt: 'This channel will be permanently deleted. This cannot be undone.',
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
      background-color: var(--v-grey-lighten4);
    }
  }

  .metadata {
    line-height: 3;
  }

  /deep/ .thumbnail {
    width: 100%;
  }

</style>
