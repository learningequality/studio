<template>

  <VCard>
    <VCardTitle>
      <VLayout row>
        <VFlex sm2 xs12>
          <VLayout align-center justify-center fill-height>
            <VImg
              v-if="node.thumbnail_url"
              height="80px"
              maxHeight="80px"
              width="80px"
              maxWidth="80px"
              :src="node.thumbnail_url"
              aspectRatio="1"
            />
            <VIcon v-else size="80px" class="channel-icon">
              apps
            </VIcon>
          </VLayout>
        </VFlex>

        <VFlex sm10 xs12>
          <!-- Metadata -->
          <div>
            <span>
              {{ $tr('resourceCount', { count: node.total_count || 0 }) }}
            </span>
            <span v-if="languageName">
              &#9679; {{ languageName }}
            </span>
          </div>
          <div>
            <h3 class="headline my-2">
              <RouterLink :to="channelRoute">
                {{ node.title }}
              </RouterLink>
            </h3>
            <div
              v-if="node.description"
              :class="{'text-truncate': !showWholeDescription && descriptionIsLong }"
            >
              {{ node.description }}
            </div>
            <VBtn
              v-if="descriptionIsLong"
              small
              flat
              class="show-more-btn"
              @click="showWholeDescription = !showWholeDescription"
            >
              <span>
                {{ showWholeDescription ? $tr('showLessLabel') : $tr('showMoreLabel') }}
                <VIcon class="arrow-icon">
                  {{ showWholeDescription ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
                </VIcon>
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

  export default {
    name: 'ChannelInfoCard',
    inject: ['RouterNames'],
    mixins: [constantsTranslationMixin],
    props: {
      node: {
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
        return this.translateLanguage(this.node.language);
      },
      descriptionIsLong() {
        // "long" arbitrarily means it's longer than 120 characters
        return this.node.description.length > 120;
      },
      channelRoute() {
        return {
          name: this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            channelId: this.node.node_id,
            nodeId: this.node.id,
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

</style>
