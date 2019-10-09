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
          <VFlex xs12>
            <VLayout class="grey--text" justify-space-between>
              <VFlex xs4>
                <span v-if="language">
                  {{ language.native_name }}
                </span>
                <span v-else>
                  &nbsp;
                </span>
              </VFlex>
              <VFlex xs4>
                {{ $tr('resourceCount', {'count': channel.count}) }}
              </VFlex>
              <VFlex xs4>
                <span v-if="channel.published">
                  {{ $tr("versionText", {'version': channel.version}) }}
                </span>
                <span v-else>
                  &nbsp;
                </span>
              </VFlex>
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
      <VCardText v-else class="font-italic red--text">
        {{ $tr('unpublishedText') }}
      </VCardText>
      <VSpacer />
      <VBtn
        flat
        color="primary"
        :to="channelDetailsLink"
      >
        {{ $tr('details') }}
      </VBtn>
      <VBtn
        flat
        color="primary"
        :href="openChannelLink"
      >
        {{ $tr('contents') }}
      </VBtn>
      <ChannelStar
        :channelId="channelId"
        :bookmark="channel.bookmark"
      />
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
      versionText: 'Version {version}',
      details: 'Details',
      contents: 'Go to channel',
    },
  };

</script>
