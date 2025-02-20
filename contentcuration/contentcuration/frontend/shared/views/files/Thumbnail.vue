<template>

  <figure
    class="thumbnail"
    :class="{
      [kind]: compact,
      'icon-only': compact,
      'nothumbnail': !showThumbnail && !compact,
    }"
    :style="{ 'max-width': maxWidth }"
  >
    <VLayout
      v-if="kind && !printing && showKind && !compact"
      tag="figcaption"
      row
      align-center
      class="caption"
      :class="kind"
    >
      <VFlex shrink class="px-1">
        <VIconWrapper
          v-if="!compact"
          dark
          small
          :aria-label="kindTitle"
          v-text="icon"
        />
      </VFlex>
      <VFlex shrink>
        <span class="caption white--text">{{ kindTitle }}</span>
      </VFlex>
    </VLayout>
    <img
      v-if="showThumbnail"
      :src="thumbnailSrc"
      :alt="$tr('thumbnail', { title: title })"
      :style="{ objectFit }"
      class="thumbnail-image"
    >

    <!-- If printing the default icon, need to set as printable icon -->
    <div v-else-if="printing" class="printable-icon">
      <VIconWrapper :color="$vuetify.theme[kind]" capture-as-image>
        {{ icon }}
      </VIconWrapper>
    </div>

    <!-- Bury icon within SVG so it's more responsive, since font-size scaling is more difficult -->
    <svg
      v-else-if="compact"
      viewBox="0 0 24 24"
      :aria-label="kindTitle"
      class="thumbnail-image"
    >
      <text
        :x="-1"
        :y="y"
        fill="#ffffff"
        class="material-icons notranslate v-icon"
      >{{ icon }}</text>
    </svg>
    <svg
      v-else
      viewBox="0 0 24 24"
      :aria-label="kindTitle"
      class="nothumbnail-image"
      :class="$isRTL ? 'rtl-image' : 'ltr-image'"
    >
      <text
        :x="-1"
        :y="y - 3"
        :fill="$vuetify.theme.greyBorder"
        class="material-icons notranslate v-icon"
      >image</text>
    </svg>

  </figure>

</template>

<script>

  import { constantsTranslationMixin, printingMixin } from 'shared/mixins';
  import { getContentKindIcon } from 'shared/vuetify/icons';

  export default {
    name: 'Thumbnail',
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
      kind: {
        type: String,
        required: false,
        default: null,
      },
      showKind: {
        type: Boolean,
        default: true,
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
      isEmpty: {
        type: Boolean,
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
      icon() {
        return getContentKindIcon(this.kind, this.isEmpty);
      },
      thumbnailSrc() {
        return this.encoding && this.encoding.base64 ? this.encoding.base64 : this.src;
      },
      showThumbnail() {
        return this.thumbnailSrc && !this.compact;
      },
      kindTitle() {
        if (this.kind) {
          return this.translateConstant(this.kind);
        }
        return '';
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

    &.icon-only {
      padding-top: 0;
      padding-bottom: 92%;
      margin: 0 auto;
      border-radius: 3px;
    }

    &:not(.icon-only) {
      background-color: white;
      /* stylelint-disable-next-line custom-property-pattern */
      border: 1px solid var(--v-greyBorder-lighten1);
    }

    &.nothumbnail {
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-greyBackground-base);
    }
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
      height: calc(100% - $caption-height);
    }
  }

  $svg-scale: 1.25;
  $svg-width: calc(100% * 9 / 16 / $svg-scale);
  $svg-top: calc((100% * 9 / 16 / 2) - ($svg-width / 2));

  svg.thumbnail-image {
    top: 0;
    left: calc(50% - ($svg-width / 4));
    width: calc($svg-width / 4);
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
      top: calc(($caption-height / 2) + $svg-top);
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
