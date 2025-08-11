<template>

  <figure
    class="thumbnail"
    :class="{
      [kind]: compact,
      'icon-only': compact,
      nothumbnail: !showThumbnail && !compact,
      'with-caption': showCaption,
    }"
    :style="{ 'max-width': maxWidth }"
  >
    <VLayout
      v-if="showCaption"
      tag="figcaption"
      row
      align-center
      class="caption"
      :class="kind"
    >
      <VFlex
        shrink
        class="px-1"
      >
        <KIcon
          :icon="icon"
          class="icon-thumbnail"
          :style="{ fill: '#ffffff' }"
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
    <div
      v-else-if="printing"
      class="printable-icon"
    >
      <!-- <VIconWrapper
        :color="$vuetify.theme[kind]"
        capture-as-image
      >
        {{ icon }}
      </VIconWrapper> -->
      <KIcon
        class="icon-thumbnail"
        :icon="icon"
      />
    </div>

    <!-- Bury icon within SVG so it's more responsive, since font-size scaling is more difficult -->
    <div
      v-else-if="compact"
      class="kicon-wrapper"
    >
      <KIcon
        :icon="icon"
        class="icon-thumbnail"
        :style="{ fill: '#ffffff' }"
      />
    </div>
    <div
      v-else
      class="kicon-wrapper"
    >
      <KIcon
        icon="image"
        class="icon-thumbnail"
        :style="{ fill: '#123345', width: '40%', height: 'auto' }"
      />
    </div>
  </figure>

</template>


<script>

  import { getContentKindIcon } from 'shared/utils/icons';
  import { constantsTranslationMixin, printingMixin } from 'shared/mixins';

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
      objectFit() {
        return this.kind ? 'cover' : 'contain';
      },
      icon() {
        return getContentKindIcon(this.kind, this.isEmpty);
      },
      showCaption() {
        return this.kind && !this.printing && this.showKind && !this.compact;
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
  $svg-scale: 1.25;
  $aspect-ratio: 9 / 16;

  $aspect-percentage: $aspect-ratio * 100%;
  $half-aspect-percentage: $aspect-percentage / 2;

  $svg-width: $aspect-percentage / $svg-scale;
  $svg-top: $half-aspect-percentage - ($svg-width / 2);
  $svg-width-quarter: $svg-width / 4;
  $svg-left-position: 50% - $svg-width-quarter;

  .thumbnail {
    position: relative;
    /* stylelint-disable-next-line  */
    padding-bottom: $aspect-percentage;

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
      height: calc(100% - #{$caption-height});
    }
  }

  svg.thumbnail-image {
    top: 0;
    left: $svg-left-position;
    width: $svg-width-quarter;
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
      top: calc(#{$caption-height / 2} + #{$svg-top});
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

  .kicon-wrapper {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;

    .icon-thumbnail {
      top: 0;
    }
  }

  .thumbnail.with-caption {
    .kicon-wrapper {
      height: calc(100% - #{$caption-height});
    }
  }

</style>
