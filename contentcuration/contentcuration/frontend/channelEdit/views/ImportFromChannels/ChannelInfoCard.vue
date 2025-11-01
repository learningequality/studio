<template>

  <VCard
    ref="card"
    hover
    :to="channelRoute"
  >
    <VCardTitle>
      <VLayout
        row
        wrap
      >
        <VFlex
          lg2
          md4
          sm5
          xs12
          class="px-3"
        >
          <VLayout
            align-center
            justify-center
            fill-height
          >
            <Thumbnail
              v-if="channel.thumbnail_url"
              :src="channel.thumbnail_url"
              :encoding="channel.thumbnail_encoding"
              style="width: 100%"
            />
            <VIconWrapper
              v-else
              size="80px"
              class="channel-icon"
            >
              apps
            </VIconWrapper>
          </VLayout>
        </VFlex>

        <VFlex
          lg10
          md8
          sm7
          xs12
          class="px-4"
        >
          <h3
            class="font-weight-bold notranslate text-truncate title"
            dir="auto"
          >
            {{ channel.name }}
          </h3>
          <!-- Metadata -->
          <div class="grey--text metadata my-2">
            <span>
              {{ $tr('resourceCount', { count: channel.count || 0 }) }}
            </span>
            <span v-if="languageName">
              {{ languageName }}
            </span>
          </div>
          <ToggleText
            v-if="channel.description"
            :text="channel.description"
            notranslate
            :splitAt="250"
            dir="auto"
          />
        </VFlex>
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
    inject: ['RouteNames'],
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
          name: this.RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            channelId: this.channel.id,
            nodeId: this.channel.root_id,
          },
          query: this.$route.query,
        };
      },
    },
    methods: {
      /**
       * @public
       */
      focus() {
        this.$refs.card.$el.focus();
      },
    },
    $trs: {
      resourceCount: '{count, number} {count, plural, one {resource} other {resources}}',
    },
  };

</script>


<style lang="scss" scoped>

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
  }

</style>
