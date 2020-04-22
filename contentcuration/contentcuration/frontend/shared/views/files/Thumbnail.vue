<template>

  <figure
    class="thumbnail"
    :class="{
      [kind]: compact,
      'icon': !showThumbnail,
      'icon-only': compact,
    }"
    :style="{ 'max-width': maxWidth }"
  >
    <VLayout
      v-if="kind"
      v-show="showThumbnail"
      tag="figcaption"
      row
      align-center
      class="caption"
      :class="kind"
    >
      <VFlex shrink class="pr-1">
        <Icon
          v-if="showThumbnail"
          dark
          small
          :aria-label="kindTitle"
          v-text="icon"
        />
      </VFlex>
      <VFlex shrink>
        <span class="white--text caption">{{ kindTitle }}</span>
      </VFlex>
    </VLayout>
    <img
      v-if="showThumbnail"
      :src="thumbnailSrc"
      :alt="$tr('thumbnail', { title: title })"
      class="thumbnail-image"
    >
    <!-- Bury icon within SVG so it's more responsive, since font-size scaling is more difficult -->
    <svg
      v-else
      viewBox="0 0 24 24"
      :aria-label="kindTitle"
      class="thumbnail-image"
    >
      <text
        x="-2"
        :y="y"
        :fill="compact ? '#ffffff' : $vuetify.theme[kind]"
        class="v-icon material-icons notranslate"
      >{{ icon }}</text>
    </svg>
  </figure>

</template>

<script>

  import { constantsTranslationMixin } from 'shared/mixins';
  import { getContentKindIcon } from 'shared/vuetify/icons';

  export default {
    name: 'Thumbnail',
    mixins: [constantsTranslationMixin],
    props: {
      src: {
        type: String,
        required: false,
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
      icon() {
        return getContentKindIcon(this.kind, this.isEmpty);
      },
      thumbnailSrc() {
        const src = this.encoding && this.encoding.base64 ? this.encoding.base64 : this.src;

        return !src && !this.kind ? require('shared/images/kolibri_placeholder.png') : src;
      },
      showThumbnail() {
        return this.thumbnailSrc && !this.compact;
      },
      kindTitle() {
        return this.translateConstant(this.kind);
      },
    },
    $trs: {
      thumbnail: '{title} thumbnail',
    },
  };

</script>

<style lang="less" scoped>

  @caption-height: 25px;

  .thumbnail {
    position: relative;
    /* stylelint-disable-next-line  */
    padding-bottom: 100% * 9 / 16;

    &.icon {
      padding-top: 25px;
    }

    &.icon-only {
      padding-top: 0;
      padding-bottom: 92%;
      margin: 0 auto;
      border-radius: 3px;
    }
  }

  .caption {
    width: 100%;
    height: @caption-height;
    padding: 0 5px;
    line-height: 11px;
  }

  .thumbnail-image {
    position: absolute;
    display: block;
  }

  img.thumbnail-image {
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;

    .caption + & {
      height: calc(100% - @caption-height);
    }
  }

  @svg-scale: 1.25;
  @svg-width: 100% * 9 / 16 / @svg-scale;
  @svg-top: (100% * 9 / 16 / 2) - (@svg-width / 2);
  svg.thumbnail-image {
    top: 0;
    left: 50% - (@svg-width / 2);
    width: @svg-width;
    margin: 0 auto;
    overflow: visible;

    .caption + & {
      top: calc((@caption-height / 2) + @svg-top);
    }

    .icon-only & {
      top: 18%;
      left: 21%;
      display: block;
      width: 55%;
    }

    text {
      font-size: 1.8em;
      line-height: 1.8em;
    }
  }

</style>
