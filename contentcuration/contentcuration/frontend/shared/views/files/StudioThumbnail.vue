<template>

  <div
    class="thumbnail"
    :style="{ borderColor: $themeTokens.fineLine }"
  >
    <figure v-if="!printing">
      <figcaption
        v-if="kind"
        class="caption"
        :class="kind"
      >
        <KIcon
          class="caption-icon"
          :icon="kindIcon"
          :color="$themeTokens.textInverted"
        />
        <span :style="{ color: $themeTokens.textInverted }">
          {{ kindTitle }}
        </span>
      </figcaption>

      <KImg
        :src="thumbnailSrc"
        isDecorative
        aspectRatio="16:9"
      >
        <template #placeholder>
          <span class="placeholder-wrapper">
            <KIcon
              class="placeholder-icon"
              icon="image"
              :color="$themePalette.grey.v_400"
            />
          </span>
        </template>
      </KImg>
    </figure>

    <div v-else>
      <KImg
        v-if="thumbnailSrc"
        :src="thumbnailSrc"
        isDecorative
        aspectRatio="16:9"
      />
      <div
        v-else
        class="print-wrapper"
        capture-as-image
        :style="printIconStyle"
      >
        <KIcon
          class="print-icon"
          :icon="kind ? kindIcon : 'image'"
          :color="kind ? $vuetify.theme[kind] : $themePalette.grey.v_400"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import { constantsTranslationMixin } from 'shared/mixins';
  import { getContentKindIcon } from 'shared/utils/icons';

  export default {
    name: 'StudioThumbnail',
    mixins: [constantsTranslationMixin],
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
      printing: {
        type: Boolean,
        default: false,
      },
      printIconStyle: {
        type: Object,
        default() {
          return {};
        },
      },
    },
    computed: {
      kindIcon() {
        return getContentKindIcon(this.kind);
      },
      thumbnailSrc() {
        return this.encoding && this.encoding.base64 ? this.encoding.base64 : this.src;
      },
      kindTitle() {
        if (this.kind) {
          return this.translateConstant(this.kind);
        }
        return '';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .thumbnail {
    border: 1px solid;
  }

  .caption {
    display: flex;
    align-items: center;
    height: 25px;
    padding: 12px 0;
    line-height: 11px;
  }

  .caption-icon {
    margin-right: 8px;
    margin-left: 8px;
  }

  .placeholder-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .placeholder-icon {
    width: 40%;
    height: 40%;
  }

  .print-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .print-icon {
    width: 30%;
    height: 30%;
  }

</style>
