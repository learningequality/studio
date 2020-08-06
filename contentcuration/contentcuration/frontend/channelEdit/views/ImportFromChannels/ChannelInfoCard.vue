<template>

  <VCard :to="channelRoute">
    <VCardTitle>
      <VLayout row>
        <VFlex sm2 xs12>
          <VLayout align-center justify-center fill-height>
            <Thumbnail
              v-if="channel.thumbnail_url"
              :src="channel.thumbnail_url"
              :encoding="channel.thumbnail_encoding"
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
            <div
              v-if="channel.description"
              :class="{'text-truncate': !showWholeDescription && descriptionIsLong }"
              class="notranslate"
            >
              {{ channel.description }}
            </div>
            <VBtn
              v-if="descriptionIsLong"
              small
              flat
              class="show-more-btn"
              color="primary"
              @click.stop.prevent="showWholeDescription = !showWholeDescription"
            >
              <span>
                {{ showWholeDescription ? $tr('showLessLabel') : $tr('showMoreLabel') }}
                <Icon class="arrow-icon">
                  {{ showWholeDescription ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
                </Icon>
              </span>
            </VBtn>
          </div>
        </VFLex>
      </VLayout>
    </VCardTitle>
  </VCard>

</template>


<script>

  import { constantsTranslationMixin } from 'shared/mixins';
  import Thumbnail from 'shared/views/files/Thumbnail';

  export default {
    name: 'ChannelInfoCard',
    inject: ['RouterNames'],
    components: { Thumbnail },
    mixins: [constantsTranslationMixin],
    props: {
      channel: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        showWholeDescription: false,
      };
    },
    computed: {
      languageName() {
        return this.translateLanguage(this.channel.language);
      },
      descriptionIsLong() {
        // "long" arbitrarily means it's longer than 120 characters
        return this.channel.description.length > 120;
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
      showMoreLabel: 'Show more',
      showLessLabel: 'Show less',
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
