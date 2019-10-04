<template>
  <v-scale-transition origin="center center">
    <VCard
      tabindex="0"
      :dark="fullscreen"
      flat
      class="preview-area"
      :class="{'fullscreen-mode': fullscreen}"
      @keydown.esc="fullscreen = false"
    >
      <v-toolbar v-if="fullscreen" dark color="grey darken-3" dense>
        <v-toolbar-title>{{ nodeTitle }}</v-toolbar-title>
      </v-toolbar>
      <v-toolbar v-if="fullscreen" light dense>
        {{ $tr('fullscreenModeText') }}
        <v-spacer />
        <v-btn flat @click="fullscreen = false">
          {{ $tr('exitFullscreen') }}
        </v-btn>
      </v-toolbar>
      <ContentRenderer :file="file" :fullscreen="fullscreen" />
      <p v-if="!fullscreen" class="fullscreen-toggle">
        <a v-if="showFullscreenOption" class="action-link" @click="fullscreen = true">
          {{ $tr('viewFullscreen') }}
        </a>
      </p>
    </VCard>
  </v-scale-transition>
</template>

<script>

  import ContentRenderer from './ContentRenderer.vue';

  export default {
    name: 'FilePreview',
    $trs: {
      viewFullscreen: 'View Fullscreen',
      exitFullscreen: 'Exit Fullscreen',
      fullscreenModeText: 'Fullscreen mode',
    },
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
      isVideo() {
        return this.file.file_format === 'mp4';
      },
      isAudio() {
        return this.file.file_format === 'mp3';
      },
      isHTML() {
        return this.file.file_format === 'zip';
      },
      isPDF() {
        return this.file.file_format === 'pdf';
      },
      showFullscreenOption() {
        return this.file && this.file.file_on_disk && !this.isAudio && !this.file.uploading;
      },
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
