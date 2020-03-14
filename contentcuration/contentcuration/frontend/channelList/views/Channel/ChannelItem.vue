<template>

  <VCard class="my-3" data-test="channel-card" @click="openChannelLink">
    <VLayout row wrap>
      <VFlex xs12 sm3>
        <VCardTitle>
          <VImg :src="channel.thumbnail_url" contain :aspect-ratio="16/9" />
        </VCardTitle>
      </VFlex>
      <VFlex xs12 sm9>
        <VCardTitle>
          <VFlex xs12>
            <VLayout class="grey--text" justify-space-between>
              <VFlex xs6 sm4>
                <span v-if="language">
                  {{ language.native_name }}
                </span>
                <span v-else>
                  &nbsp;
                </span>
              </VFlex>
              <VFlex xs6 sm4>
                {{ $tr('resourceCount', {'count': $formatNumber(channel.count)}) }}
              </VFlex>
              <VFlex v-if="$vuetify.breakpoint.smAndUp" sm4 />
            </VLayout>
          </VFlex>
          <VFlex xs12>
            <h3 class="headline notranslate">
              {{ channel.name }}
            </h3>
          </VFlex>
          <VFlex xs12 class="notranslate">
            {{ channel.description }}
          </VFlex>
        </VCardTitle>
      </VFlex>
    </VLayout>
    <VCardActions>
      <VCardText v-if="channel.published" class="grey--text">
        {{ $tr(
          'lastPublished',
          {
            'last_published': $formatRelative(
              channel.last_published,
              { now: new Date() }
            )
          })
        }}
      </VCardText>
      <VCardText v-else class="font-italic grey--text">
        {{ $tr('unpublishedText') }}
      </VCardText>
      <VSpacer />
      <VTooltip v-if="loggedIn" bottom>
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
            <VIcon class="notranslate">
              info
            </VIcon>
          </VBtn>
        </template>
        <span>{{ $tr('details') }}</span>
      </VTooltip>
      &nbsp;
      <ChannelStar
        v-if="loggedIn"
        :channelId="channelId"
        :bookmark="channel.bookmark"
      />
      &nbsp;
      <VMenu offset-y>
        <template v-slot:activator="{ on }">
          <VBtn icon flat data-test="menu" v-on="on" @click.stop.prevent>
            <VIcon class="notranslate">
              more_vert
            </VIcon>
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
              <VIcon class="notranslate">
                edit
              </VIcon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('editChannel') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.stop="tokenDialog=true">
            <VListTileAction>
              <VIcon class="notranslate">
                content_copy
              </VIcon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('copyToken') }}</VListTileTitle>
          </VListTile>
          <VListTile v-if="canEdit" @click.stop="deleteDialog=true">
            <VListTileAction>
              <VIcon class="notranslate">
                delete
              </VIcon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('deleteChannel') }}</VListTileTitle>
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
    <PrimaryDialog v-model="tokenDialog" :title="$tr('copyTitle')" lazy>
      <div style="margin-bottom: 32px;">
        <label class="grey--text">{{ $tr('token') }}</label>
        <CopyToken :token="channel.primary_token" />
        <p style="margin: 48px 0px 16px;" class="subheading">
          {{ $tr('tokenText') }}
        </p>
        <label class="grey--text">{{ $tr('channelId') }}</label>
        <CopyToken :token="channel.id" :hyphenate="false" />
      </div>
      <template v-slot:actions>
        <VSpacer />
        <VBtn color="primary" @click="tokenDialog=false">
          {{ $tr('close') }}
        </VBtn>
      </template>
    </PrimaryDialog>
  </VCard>

</template>

<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { RouterNames } from '../../constants';
  import ChannelStar from './ChannelStar';
  import { Languages } from 'shared/constants';
  import PrimaryDialog from 'shared/views/PrimaryDialog';
  import CopyToken from 'shared/views/CopyToken';

  export default {
    name: 'ChannelItem',
    components: {
      ChannelStar,
      PrimaryDialog,
      CopyToken,
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
        return Languages.find(language => language.id === this.channel.language);
      },
      channelEditLink() {
        return {
          name: RouterNames.CHANNEL_EDIT,
          params: {
            channelId: this.channelId,
          },
        };
      },
      channelDetailsLink() {
        return {
          name: this.detailsRouteName,
          params: {
            channelId: this.channelId,
          },
        };
      },
      canEdit() {
        return this.allowEdit && this.channel.edit && !this.channel.ricecooker_version;
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
        if (this.loggedIn) {
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
      editChannel: 'Edit channel',
      copyToken: 'Copy channel token',
      deleteChannel: 'Delete channel',
      deleteTitle: 'Delete this channel',
      deletePrompt: 'Once you delete a channel, the channel will be permanently deleted.',
      cancel: 'Cancel',
      copyTitle: 'Copy channel token',
      token: 'Channel token',
      tokenText: 'For Kolibri versions 0.6.0 and below',
      channelId: 'Channel ID',
      close: 'Close',
    },
  };

</script>

<style lang="less" scoped>

  .v-card {
    width: 100%;
    .headline {
      font-weight: bold;
    }
  }

</style>
