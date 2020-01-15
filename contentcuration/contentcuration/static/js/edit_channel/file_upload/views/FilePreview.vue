<template>

  <VScaleTransition origin="center center">
    <VCard
      tabindex="0"
      :dark="fullscreen"
      flat
      class="preview-area"
      :class="{'fullscreen-mode': fullscreen}"
      app
      @keydown.esc="fullscreen = false"
    >
      <VToolbar v-if="fullscreen" dark color="grey darken-3" dense>
        <VToolbarTitle>{{ nodeTitle }}</VToolbarTitle>
      </VToolbar>
      <VToolbar v-if="fullscreen" light dense>
        {{ $tr('fullscreenModeText') }}
        <VSpacer />
        <VBtn flat @click="fullscreen = false">
          {{ $tr('exitFullscreen') }}
        </VBtn>
      </VToolbar>
      <ContentRenderer :file="file" :fullscreen="fullscreen" />
      <p v-if="!fullscreen" class="fullscreen-toggle">
        <a v-if="showFullscreenOption" class="action-link" @click="fullscreen = true">
          {{ $tr('viewFullscreen') }}
        </a>
      </p>
    </VCard>
  </VScaleTransition>

</template>

<script>

  import ContentRenderer from './ContentRenderer.vue';

  export default {
    name: 'FilePreview',
    components: {
      ContentRenderer,
    },
    props: {
      file: {
        type: Object,
      },
      nodeTitle: {
        type: String,
      },
    },
    data() {
      return {
        fullscreen: false,
      };
    },
    computed: {
      isPreviewable() {
        let availablePreviewFormats = ['mp4', 'mp3', 'zip', 'pdf'];
        return _.contains(availablePreviewFormats, this.file.file_format);
      },
      isAudio() {
        return this.file.file_format === 'mp3';
      },
      showFullscreenOption() {
        return (
          this.file &&
          this.file.file_on_disk &&
          this.isPreviewable &&
          !this.isAudio &&
          !this.file.uploading
        );
      },
    },
    $trs: {
      viewFullscreen: 'View Fullscreen',
      exitFullscreen: 'Exit Fullscreen',
      fullscreenModeText: 'Fullscreen mode',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .fullscreen-toggle {
    margin-top: 8px;
  }

  .preview-area {
    top: 0;
    left: 0;
    min-width: 0;
    min-height: 0;
    outline: none;
    &.fullscreen-mode {
      position: fixed;
      z-index: 10;
      min-width: 100vw;
      min-height: 100vh;
    }
  }

</style>
