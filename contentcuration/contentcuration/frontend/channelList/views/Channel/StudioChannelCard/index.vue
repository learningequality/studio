<template>

  <KCard
    :key="channel.id"
    class="channel"
    :headingLevel="headingLevel"
    data-testid="channel-card"
    thumbnailDisplay="small"
    thumbnailAlign="left"
    :orientation="cardOrientation"
    :title="channel.name"
    :titleMaxLines="2"
    @click="onCardClick"
  >
    <template
      v-if="selectable"
      #select
    >
      <KCheckbox
        :checked="selected"
        @change="$emit('toggle-selection', channel.id)"
      >
        <span class="visuallyhidden">{{ $tr('selectChannel', { name: channel.name }) }}</span>
      </KCheckbox>
    </template>

    <template #thumbnail>
      <KImg
        :src="thumbnailSrc"
        :style="{ width: '100%', height: '100%' }"
        scaleType="contain"
        aspectRatio="16:9"
        isDecorative
      >
        <template #placeholder>
          <span class="placeholder">
            <KIcon
              :color="$themePalette.grey.v_400"
              class="placeholder-icon"
              icon="image"
            />
          </span>
        </template>
      </KImg>
    </template>

    <template #belowTitle>
      <div class="below-title">
        <div class="resource">
          <span> {{ $tr('resourceCount', { count: channel.count || 0 }) }} </span>
          <span>
            {{ language }}
          </span>
        </div>
        <div
          class="desc"
          :style="{ color: $themeTokens.text }"
        >
          {{ channel.description }}
        </div>
      </div>
    </template>

    <template #footer>
      <div class="footer">
        <div class="footer-left">
          <span :style="{ color: $themeTokens.annotation }">
            {{ getPublishStatus }}
          </span>
          <div v-if="showUpdateStatus && hasUnpublishedChanges">
            <KTooltip
              :reference="`lastUpdatedTime`"
              placement="bottom"
              :refs="$refs"
            >
              {{
                $tr('lastUpdated', {
                  updated: $formatRelative(channel.modified, { now: new Date() }),
                })
              }}
            </KTooltip>
            <div class="last-updated">
              <KIcon
                :ref="`lastUpdatedTime`"
                :color="$themePalette.green.v_600"
                icon="dot"
              />
            </div>
          </div>
        </div>
        <div class="footer-right">
          <div ref="infoBtn">
            <router-link
              :aria-label="$tr('details')"
              :to="channelDetailsLink"
              :class="['details-link', linkComputedClass]"
              @click.native.stop
            >
              <KIcon
                class="details-icon"
                :color="$themeTokens.primary"
                icon="info"
              />
            </router-link>
            <KTooltip
              reference="infoBtn"
              :refs="$refs"
              maxWidth="200px"
            >
              {{ $tr('details') }}
            </KTooltip>
          </div>

          <slot name="footerActions"></slot>
        </div>
      </div>
    </template>
  </KCard>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { RouteNames } from '../../../constants';
  import Languages from 'shared/leUtils/Languages';

  export default {
    name: 'StudioChannelCard',
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    props: {
      orientation: {
        type: String,
        required: false,
        default: null,
        validator: value => ['vertical', 'horizontal'].includes(value),
      },
      channel: {
        type: Object,
        required: true,
      },
      showUpdateStatus: {
        type: Boolean,
        required: false,
        default: true,
      },
      selectable: {
        type: Boolean,
        default: false,
      },
      selected: {
        type: Boolean,
        default: false,
      },
      headingLevel: {
        type: Number,
        required: true,
      },
    },
    computed: {
      cardOrientation() {
        if (this.orientation) {
          return this.orientation;
        }
        return this.windowIsSmall ? 'vertical' : 'horizontal';
      },
      linkComputedClass() {
        return this.$computedClass({
          ':hover': {
            backgroundColor: 'rgba(0,0,0,.1)',
          },
          ':focus': { ...this.$coreOutline, outlineOffset: 0 },
        });
      },
      thumbnailSrc() {
        return this.channel.thumbnail_encoding && this.channel.thumbnail_encoding.base64
          ? this.channel.thumbnail_encoding.base64
          : this.channel.thumbnail_url;
      },
      getPublishStatus() {
        return this.channel.last_published
          ? this.$tr('lastPublished', {
            last_published: this.$formatRelative(this.channel.last_published, {
              now: new Date(),
            }),
          })
          : this.$tr('unpublishedText');
      },
      channelDetailsLink() {
        return {
          name: RouteNames.CHANNEL_DETAILS,
          query: {
            ...this.$route.query,
            last: this.$route.name,
          },
          params: {
            channelId: this.channel.id,
          },
        };
      },
      language() {
        const lang = Languages.get(this.channel.language);
        if (lang) {
          return lang.native_name;
        }
        return this.$tr('channelLanguageNotSetIndicator');
      },
      hasUnpublishedChanges() {
        return !this.channel.last_published || this.channel.modified > this.channel.last_published;
      },
    },
    methods: {
      onCardClick() {
        this.$emit('click');
      },
    },
    $trs: {
      resourceCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
      unpublishedText: 'Unpublished',
      lastPublished: 'Published {last_published}',
      lastUpdated: 'Updated {updated}',
      details: 'Details',
      selectChannel: 'Select {name}',
      channelLanguageNotSetIndicator: 'No language set',
    },
  };

</script>


<style lang="scss" scoped>

  .channel {
    width: 100%;
  }

  .below-title {
    font-size: 14px;
  }

  .resource {
    span:first-child::after {
      margin: 0 8px;
      content: '•';
    }
  }

  .desc {
    margin-top: 12px;
  }

  .details-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer-right,
  .footer-left,
  .last-updated {
    display: flex;
    align-items: center;
  }

  .footer-left {
    span {
      font-size: 14px;
    }

    div {
      margin-left: 8px;
    }
  }

  .details-icon {
    width: 24px;
    height: 24px;
  }

  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .placeholder-icon {
    width: 50%;
    min-width: 24px;
    height: 50%;
  }

</style>
