<template>

  <VCard class="my-3" :to="openChannelLink">
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
            <h3 class="headline">
              {{ channel.name }}
            </h3>
          </VFlex>
          <VFlex xs12>
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
      <VTooltip bottom>
        <template v-slot:activator="{ on }">
          <VBtn
            flat
            color="primary"
            icon
            :to="channelDetailsLink"
            v-on="on"
          >
            <VIcon>info</VIcon>
          </VBtn>
        </template>
        <span>{{ $tr('details') }}</span>
      </VTooltip>
      <ChannelStar
        :channelId="channelId"
        :bookmark="channel.bookmark"
      />
      <VMenu offset-y>
        <template v-slot:activator="{ on }">
          <VBtn icon flat v-on="on" @click.stop.prevent>
            <VIcon>more_vert</VIcon>
          </VBtn>
        </template>
        <VList>
          <VListTile @click.stop>
            <VListTileAction>
              <VIcon>edit</VIcon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('editChannel') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.stop>
            <VListTileAction>
              <VIcon>content_paste</VIcon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('copyToken') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.stop>
            <VListTileAction>
              <VIcon>delete</VIcon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('deleteChannel') }}</VListTileTitle>
          </VListTile>
        </VList>
      </VMenu>
    </VCardActions>
  </VCard>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { RouterNames } from '../../constants';
  import ChannelStar from './ChannelStar';
  import Constants from 'edit_channel/constants/index';

  export default {
    name: 'ChannelItem',
    components: {
      ChannelStar,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('channelList', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      language() {
        return Constants.Languages.find(language => language.id === this.channel.language);
      },
      channelDetailsLink() {
        return {
          name: RouterNames.CHANNEL_DETAILS,
          params: {
            channelId: this.channelId,
          },
        };
      },
      openChannelLink() {
        return window.Urls.channel() + `#/channel/${this.channelId}`;
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
