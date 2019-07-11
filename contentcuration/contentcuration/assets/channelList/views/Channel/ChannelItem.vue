<template>
  <VCard class="my-3" :to="channelDetailsLink">
    <VLayout>
      <VFlex xs12 sm12 md3>
        <VCardTitle>
          <VImg :src="channel.thumbnail_url" contain />
        </VCardTitle>
      </VFlex>
      <VFlex xs12 sm12 md9>
        <VLayout row wrap>
          <VFlex xs12>
            <VCardTitle>
              <h3 class="headline mb-0">
                {{ channel.name }}
              </h3>
            </VCardTitle>
          </VFlex>
        </VLayout>
        <VLayout row wrap>
          <VFlex v-if="language" class="pa-1" shrink>
            <VCardText>
              {{ language.native_name }}
            </VCardText>
          </VFlex>
          <VFlex class="pa-1" shrink>
            <VCardText>
              {{ $tr('resourceCount', {'count': channel.count}) }}
            </VCardText>
          </VFlex>
          <VFlex class="pa-1" shrink>
            <CopyToken
              v-if="channel.published"
              :key="channel.primary_token"
              :token="channel.primary_token"
            />
            <VCardText class="font-italic" v-else>
              {{ $tr('unpublishedText') }}
            </VCardText>
          </VFlex>
        </VLayout>
        <VLayout>
          <VFlex xs12>
            <VCardText>
              {{ channel.description }}
            </VCardText>
          </VFlex>
        </VLayout>
      </VFlex>
    </VLayout>
    <VLayout row wrap>
      <VFlex xs10>
        <VCardText>
          {{ $tr(
            'lastUpdated',
            {
              'updated': $formatRelative(
                channel.modified,
                { now: new Date() }
              )
            })
          }}
        </VCardText>
      </VFlex>
      <VFlex xs2>
        <VCardText v-if="channel.published">
          {{ $tr("versionText", {'version': channel.version}) }}
        </VCardText>
      </VFlex>
    </VLayout>
    <VCardActions>
      <VBtn
        color="primary"
        :to="channelDetailsLink"
      >
        {{ $tr(channel.edit ? 'editDetails' : 'viewDetails')}}
      </VBtn>
      <VBtn
        color="primary"
        :href="openChannelLink"
      >
        {{ $tr(channel.edit ? 'editContents' : 'viewContents')}}
      </VBtn>
      <VSpacer/>
      <ChannelStar
        :channel="channel"
      />
    </VCardActions>
  </VCard>
</template>

<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { RouterNames } from '../../constants';
  import Constants from 'edit_channel/constants/index';
  import CopyToken from 'edit_channel/sharedComponents/CopyToken';
  import ChannelStar from './ChannelStar';

  export default {
    name: 'ChannelItem',
    $trs: {
      openChannelTitle: "{channelName} ('CTRL' or 'CMD' + click to open in new tab)",
      resourceCount: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
      unpublishedText: 'Unpublished',
      lastUpdated: 'Updated {updated}',
      versionText: 'Version {version}',
      editDetails: 'Edit details',
      viewDetails: 'View details',
      editContents: 'Edit contents',
      viewContents: 'View contents',
    },
    components: {
      CopyToken,
      ChannelStar,
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
    },
    computed: {
      ...mapState('channelList', ['activeChannel']),
      ...mapGetters('channelList', ['getChannel']),
      picture() {
        return (
          (this.channel.thumbnail_encoding && this.channel.thumbnail_encoding.base64) ||
          this.channel.thumbnail_url
        );
      },
      language() {
        return Constants.Languages.find(language => language.id === this.channel.language);
      },
      isSelected() {
        return this.activeChannel && this.channel.id === this.activeChannel.id;
      },
      channelDetailsLink() {
        return {
          name: RouterNames.CHANNEL_DETAILS,
          params: {
            channelId: this.channel.id,
          },
        };
      },
      openChannelLink() {
        return window.Urls.channel() + `#/channel/${this.channel.id}`;
      },
    },
  };

</script>
