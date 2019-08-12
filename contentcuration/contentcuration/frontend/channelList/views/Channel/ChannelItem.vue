<template>
  <VCard class="my-3" :to="channelDetailsLink">
    <VLayout>
      <VFlex xs12 sm12 md3>
        <VCardTitle>
          <VImg :src="channel.thumbnail_url" contain />
        </VCardTitle>
      </VFlex>
      <VFlex xs12 sm12 md9>
        <VCardTitle>
          <h3 class="headline">{{ channel.name }}</h3>
          <div>
            <span v-if="language">
              {{ language.native_name }}
            </span>
            {{ $tr('resourceCount', {'count': channel.count}) }}
            <span v-if="channel.published">
              {{ $tr("versionText", {'version': channel.version}) }}
            </span>
          </div>
          <div>
            {{ channel.description }}
          </div>
        </VCardTitle>
      </VFlex>
    </VLayout>
    <VCardActions>
      <VCardText v-if="channel.published">
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
      <VCardText class="font-italic red--text" v-else>
        {{ $tr('unpublishedText') }}
      </VCardText>
      <VSpacer/>
      <VBtn
        flat
        color="primary"
        :to="channelDetailsLink"
      >
        {{ $tr('details')}}
      </VBtn>
      <VBtn
        flat
        color="primary"
        :href="openChannelLink"
      >
        {{ $tr('contents')}}
      </VBtn>
      <ChannelStar
        :channelId="channelId"
        :bookmark="channel.bookmark"
      />
    </VCardActions>
  </VCard>
</template>

<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { RouterNames } from '../../constants';
  import Constants from 'edit_channel/constants/index';
  import CopyToken from 'shared/views/CopyToken';
  import ChannelStar from './ChannelStar';

  export default {
    name: 'ChannelItem',
    $trs: {
      openChannelTitle: "{channelName} ('CTRL' or 'CMD' + click to open in new tab)",
      resourceCount: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
      unpublishedText: 'Unpublished',
      lastPublished: 'Published {last_published}',
      versionText: 'Version {version}',
      details: 'Details',
      contents: 'Go to channel',
    },
    components: {
      CopyToken,
      ChannelStar,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapState('channelList', ['activeChannel']),
      ...mapGetters('channelList', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      picture() {
        return (
          (this.channel.thumbnail_encoding && this.channel.thumbnail_encoding.base64) ||
          this.channel.thumbnail_url
        );
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
  };

</script>
