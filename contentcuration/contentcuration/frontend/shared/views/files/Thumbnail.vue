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
          :style="{ fill: $themeTokens.textInverted }"
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
      <KIcon
        class="icon-thumbnail"
        :icon="icon"
        capture-as-image
      />
    </div>

    <div
      v-else-if="compact"
      class="kicon-wrapper"
    >
      <KIcon
        :icon="icon"
        class="icon-thumbnail"
        :style="{ fill: $themeTokens.textInverted }"
      />
    </div>
    <div
      v-else
      class="kicon-wrapper"
    >
      <KIcon
        icon="image"
        class="icon-thumbnail"
        :style="{ fill: $themePalette.grey.v_400, width: '40%', height: '50px' }"
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
  $aspect-ratio: 9 / 16;
  $aspect-percentage: $aspect-ratio * 100%;

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

  .thumbnail-image {
    position: absolute;
    bottom: 0;
    left: 0;
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden; // Don't show alt text outside of img boundaries

    .caption + & {
      height: calc(100% - #{$caption-height});
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
