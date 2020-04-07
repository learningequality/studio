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
      <VFlex sm12 md3 class="pa-3">
        <Thumbnail
          :src="channel.thumbnail_url"
          :encoding="channel.thumbnail_encoding"
        />
      </VFlex>
      <VFlex sm12 md9>
        <VCardTitle>
          <VFlex xs12>
            <VLayout class="grey--text" justify-space-between>
              <VFlex sm6 md4>
                <span v-if="language">
                  {{ language.native_name }}
                </span>
                <span v-else>
                  &nbsp;
                </span>
              </VFlex>
              <VFlex sm6 md4>
                {{ $tr('resourceCount', {'count': channel.count}) }}
              </VFlex>
              <VFlex v-if="$vuetify.breakpoint.smAndUp" sm4 />
            </VLayout>
          </VFlex>
          <VFlex xs12>
            <h3 class="headline notranslate font-weight-bold" dir="auto">
              {{ channel.name }}
            </h3>
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
      <VSpacer />
      <VTooltip v-if="!libraryMode" bottom>
        <template v-slot:activator="{ on }">
          <VBtn
            flat
            color="primary"
            icon
            :to="channelDetailsLink"
            data-test="details-button"
            v-on="on"
            @click.stop
          >
            <Icon>info</Icon>
          </VBtn>
        </template>
        <span>{{ $tr('details') }}</span>
      </VTooltip>
      &nbsp;
      <ChannelStar
        v-if="loggedIn"
        :channelId="channelId"
        :bookmark="channel.bookmark"
        @mouseenter="hideHighlight = true"
        @mouseleave="hideHighlight = false"
      />
      &nbsp;
      <VMenu v-if="canEdit || channel.published" offset-y>
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
          <VListTile v-if="channel.published" @click.stop="tokenDialog=true">
            <VListTileAction>
              <Icon>content_copy</Icon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('copyToken') }}</VListTileTitle>
          </VListTile>
          <VListTile v-if="canEdit" @click.stop="deleteDialog=true">
            <VListTileAction>
              <Icon>delete</Icon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('deleteChannel') }}</VListTileTitle>
          </VListTile>
          <VListTile
            v-if="libraryMode && channel.published"
            :href="demoServerLink"
            target="_blank"
          >
            <VListTileAction>
              <Icon>launch</Icon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('viewContent') }}</VListTileTitle>
          </VListTile>
        </VList>
      </VMenu>
    </VCardActions>

    <!-- Delete dialog -->
    <PrimaryDialog v-model="deleteDialog" :title="$tr('deleteTitle')" lazy>
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
  import Constants from 'edit_channel/constants/index';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import Thumbnail from 'shared/views/files/Thumbnail';

  export default {
    name: 'ChannelItem',
    components: {
      ChannelStar,
      PrimaryDialog,
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
        default: RouterNames.CHANNEL_DETAILS,
      },
      allowEdit: {
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
        return Constants.Languages.find(language => language.id === this.channel.language);
      },
      channelEditLink() {
        return {
          name: RouterNames.CHANNEL_EDIT,
          query: this.$route.query,
          params: {
            channelId: this.channelId,
          },
        };
      },
      channelDetailsLink() {
        return {
          name: this.detailsRouteName,
          query: this.$route.query,
          params: {
            channelId: this.channelId,
          },
        };
      },
      canEdit() {
        return this.allowEdit && this.channel.edit && !this.channel.ricecooker_version;
      },
      libraryMode() {
        return window.libraryMode;
      },
      demoServerLink() {
        return `https://kolibridemo.learningequality.org/en/learn/#/topics/${this.channelId}`;
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
      resourceCount: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
      unpublishedText: 'Unpublished',
      lastPublished: 'Published {last_published}',
      details: 'Details',
      viewContent: 'View channel content',
      editChannel: 'Edit channel',
      copyToken: 'Copy channel token',
      deleteChannel: 'Delete channel',
      deleteTitle: 'Delete this channel',
      deletePrompt: 'Once you delete a channel, the channel will be permanently deleted.',
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

</style>
