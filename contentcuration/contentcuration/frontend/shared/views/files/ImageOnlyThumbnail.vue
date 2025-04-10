<template>

  <figure
    :class="{
      'thumbnail': !compact,
      'icon-only': compact,
      'nothumbnail': !showThumbnail && !compact,
    }"
    :style="{ 'max-width': maxWidth }"
  >
    <img
      v-if="showThumbnail && !compact"
      :src="thumbnailSrc"
      :alt="$tr('thumbnail', { title: title })"
      :style="{ objectFit }"
      class="thumbnail-image"
    >

    <!-- If printing the default icon, need to set as printable icon -->
    <div v-else-if="compact || printing">
      <ContentNodeLearningActivityIcon
        v-if="learningActivities && !isTopic"
        :learningActivities="learningActivities"
      />
      <KIcon v-else-if="isTopic" :icon="kind" :aria-label="translateConstant(kind)" />
    </div>
    <svg
      v-else
      viewBox="0 0 40 40"
      :aria-label="title"
      class="nothumbnail-image"
      :class="$isRTL ? 'rtl-image' : 'ltr-image'"
    >
      <KIcon
        icon="image"
        :x="-1"
        :y="y - 14"
        :style="{ fill: '#999999' }"
      />
    </svg>

  </figure>

</template>

<script>

  import { constantsTranslationMixin, printingMixin } from 'shared/mixins';
  import ContentNodeLearningActivityIcon from 'shared/views/ContentNodeLearningActivityIcon';

  export default {
    name: 'ImageOnlyThumbnail',
    components: {
      ContentNodeLearningActivityIcon,
    },
    mixins: [constantsTranslationMixin, printingMixin],
    props: {
      src: {
        type: String,
        required: false,
        default: '',
      },
      encoding: {
        type: Object,
        default() {
          return {};
        },
      },
      learningActivities: {
        type: Object,
        required: false,
        default: null,
      },
      kind: {
        type: String,
        required: false,
        default: null,
      },
      isTopic: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        required: false,
        default: '',
      },
      compact: {
        type: Boolean,
        required: false,
        default: false,
      },
      maxWidth: {
        type: [Number, String],
        default: 'none',
      },
    },
    computed: {
      y() {
        switch (this.kind) {
          case 'exercise':
            return 28;
          case 'topic':
          case 'audio':
          default:
            return 26;
        }
      },
      objectFit() {
        return this.kind ? 'cover' : 'contain';
      },
      thumbnailSrc() {
        return this.encoding && this.encoding.base64 ? this.encoding.base64 : this.src;
      },
      showThumbnail() {
        return this.thumbnailSrc && !this.compact;
      },
    },
    $trs: {
      thumbnail: '{title} thumbnail',
    },
  };

</script>

<style lang="scss" scoped>

  $caption-height: 25px;

  .thumbnail {
    position: relative;
    /* stylelint-disable-next-line  */
    padding-bottom: calc(100% * 9 / 16);
    border-radius: 3px;

    &.nothumbnail {
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-greyBackground-base);
    }
  }

  .icon-only {
    position: relative;
    padding-top: 0;
    padding-bottom: 0;
    margin: 0 auto;
  }

  .caption {
    width: 100%;
    height: $caption-height;
    padding: 0 5px;
    line-height: 11px;
  }

  .thumbnail-image,
  .nothumbnail-image {
    position: absolute;
    display: block;
  }

  img.thumbnail-image {
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden; // Don't show alt text outside of img boundaries

    .caption + & {
      height: calc(100% - #{$caption-height});
    }
  }

  $svg-scale: 1.25;
  $svg-width: calc(100% * 9 / 16 / #{$svg-scale});
  $svg-top: calc((100% * 9 / 16 / 2) - (#{$svg-width} / 2));

  svg.thumbnail-image {
    top: 0;
    left: calc(50% - (#{$svg-width} / 4));
    width: calc(#{$svg-width} / 4);
    margin: 0 auto;
    overflow: visible;

    .icon-only & {
      top: 18%;
      left: 21%;
      display: block;
      width: 55%;

      [dir='rtl'] & {
        left: -10px;
      }
    }

    text {
      font-size: 1.8em;
      line-height: 1.8em;
    }
  }

  svg.nothumbnail-image {
    top: 0;
    width: $svg-width;
    margin: 0 auto;
    overflow: visible;

    &.ltr-image {
      left: 36%;
    }

    &.rtl-image {
      right: 66%;
    }

    .caption + & {
      top: calc((#{$caption-height} / 2) + #{$svg-top});
    }

    .icon-only & {
      top: 18%;
      left: 21%;
      display: block;
      width: 55%;
    }

    text {
      font-size: 1em;
      line-height: 1em;
    }
  }

  .printable-icon {
    width: 100%;
    height: 0;
    font-size: xx-large;
    text-align: center;

    .v-icon {
      font-size: 300%;
    }
  }

</style>
