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
          <VFlex xs11 grow>
            <VCardTitle>
              <h3 class="headline mb-0">
                {{ channel.name }}
              </h3>
            </VCardTitle>
          </VFlex>
          <VFlex xs1 shrink>
            <VCardTitle>
              <Star
                :starred="channel.bookmark"
                @starred="addStar(channel.id)"
                @unstarred="removeStar(channel.id)"
              />
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
  </VCard>
</template>

<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { RouterNames } from '../../constants';
  import Constants from 'edit_channel/constants/index';
  import CopyToken from 'edit_channel/sharedComponents/CopyToken';
  import Star from 'edit_channel/sharedComponents/Star';

  export default {
    name: 'ChannelItem',
    $trs: {
      openChannelTitle: "{channelName} ('CTRL' or 'CMD' + click to open in new tab)",
      resourceCount: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
      unpublishedText: 'Unpublished',
      lastUpdated: 'Updated {updated}',
      versionText: 'Version {version}',
    },
    components: {
      CopyToken,
      Star,
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
    },
    methods: {
      ...mapActions('channelList', ['addStar', 'removeStar']),
      openChannel(event) {
        if (event && (event.metaKey || event.ctrlKey)) {
          if (this.channel.EDITABLE) {
            window.open(window.Urls.channel(this.channel.id), '_blank');
          } else {
            window.open(window.Urls.channel_view_only(this.channel.id), '_blank');
          }
        } else if (!this.activeChannel || this.channel.id !== this.activeChannel.id) {
          // Only load if it isn't already the active channel
          this.setChannel(this.channel.id);
        }
      },
    },
  };

</script>
