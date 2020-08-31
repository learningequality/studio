<template>

  <VCard :to="channelRoute">
    <VCardTitle>
      <VLayout row wrap>
        <VFlex sm2 xs12 class="px-3">
          <VLayout align-center justify-center fill-height>
            <Thumbnail
              v-if="channel.thumbnail_url"
              :src="channel.thumbnail_url"
              :encoding="channel.thumbnail_encoding"
              style="width: 100%;"
            />
            <Icon v-else size="80px" class="channel-icon">
              apps
            </Icon>
          </VLayout>
        </VFlex>

        <VFlex sm10 xs12>
          <!-- Metadata -->
          <div class="metadata">
            <span>
              {{ $tr('resourceCount', { count: channel.count || 0 }) }}
            </span>
            <span v-if="languageName">
              {{ languageName }}
            </span>
          </div>
          <div>
            <h3 class="headline my-2 notranslate">
              {{ channel.name }}
            </h3>
            <ToggleText
              v-if="channel.description"
              :text="channel.description"
              notranslate
            />
          </div>
        </VFLex>
      </VLayout>
    </VCardTitle>
  </VCard>

</template>


<script>

  import { constantsTranslationMixin } from 'shared/mixins';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import ToggleText from 'shared/views/ToggleText';

  export default {
    name: 'ChannelInfoCard',
    inject: ['RouterNames'],
    components: { Thumbnail, ToggleText },
    mixins: [constantsTranslationMixin],
    props: {
      channel: {
        type: Object,
        required: true,
      },
    },
    computed: {
      languageName() {
        return this.translateLanguage(this.channel.language);
      },
      channelRoute() {
        return {
          name: this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            channelId: this.channel.id,
            nodeId: this.channel.root_id,
          },
        };
      },
    },
    $trs: {
      resourceCount: '{count, number} {count, plural, one {resource} other {resources}}',
    },
  };

</script>


<style lang="less" scoped>

  .show-more-btn {
    margin-left: -7px;
    text-decoration: underline;
    text-transform: none !important;
  }

  .channel-icon {
    font-size: 100px;
  }

  .arrow-icon {
    margin-bottom: -3px;
  }

  .metadata {
    color: var(--v-grey-darken2);
    span:not(:last-child)::after {
      margin: 0 8px;
      color: var(--v-grey-base);
      content: '•';
    }
  }

  .v-card {
    cursor: pointer;
    &:hover {
      background-color: var(--v-greyBackground-base);
    }
  }

</style>
