<template>

  <VScaleTransition origin="center center">
    <VCard
      ref="preview"
      tabindex="0"
      :dark="fullscreen"
      flat
      class="preview-area"
      :class="{'fullscreen-mode': fullscreen}"
      app
    >
      <VToolbar v-if="fullscreen" dark color="grey darken-3" dense>
        <VToolbarTitle class="notranslate">
          {{ nodeTitle }}
        </VToolbarTitle>
      </VToolbar>
      <VToolbar v-if="fullscreen" light dense>
        {{ $tr('fullscreenModeText') }}
        <VSpacer />
        <VBtn data-test="closefullscreen" flat @click="fullscreen = false">
          {{ $tr('exitFullscreen') }}
        </VBtn>
      </VToolbar>
      <ContentRenderer
        :fileId="fileId"
        :fullscreen="fullscreen"
        :supplementaryFileIds="supplementaryFileIds"
      />
      <p v-if="!fullscreen" class="fullscreen-toggle">
        <ActionLink
          v-if="showFullscreenOption"
          data-test="openfullscreen"
          :text="$tr('viewFullscreen')"
          @click="fullscreen = true"
        />
      </p>
    </VCard>
  </VScaleTransition>

</template>

<script>

  import { mapGetters } from 'vuex';
  import uniq from 'lodash/uniq';
  import ContentRenderer from './ContentRenderer';
  import Constants from 'edit_channel/constants/index';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';

  export default {
    name: 'FilePreview',
    components: {
      ContentRenderer,
      ActionLink,
    },
    props: {
      fileId: {
        type: String,
        required: false,
      },
      nodeId: {
        type: String,
        required: false,
      },
      hideFullscreenOption: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        fullscreen: false,
      };
    },
    computed: {
      ...mapGetters('file', ['getFile', 'getFiles']),
      ...mapGetters('contentNode', ['getContentNode']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      file() {
        return this.getFile(this.fileId);
      },
      nodeTitle() {
        return this.node && this.node.title;
      },
      supplementaryFileIds() {
        let files = this.node ? this.getFiles(this.node.files) : [];
        return files.filter(f => f.preset.supplementary).map(f => f.id);
      },
      isPreviewable() {
        let availablePreviewFormats = uniq(
          Constants.FormatPresets.filter(f => f.display && !f.supplementary).flatMap(
            f => f.allowed_formats
          )
        );
        return availablePreviewFormats.includes(this.file.file_format);
      },
      isAudio() {
        return this.file.file_format === 'mp3';
      },
      showFullscreenOption() {
        return (
          !this.hideFullscreenOption &&
          this.file &&
          this.file.url &&
          this.isPreviewable &&
          !this.isAudio &&
          !this.file.uploading
        );
      },
    },
    watch: {
      fullscreen(isFullscreen) {
        if (isFullscreen) {
          let previewElement = this.$refs.preview.$el;
          if (previewElement.requestFullscreen) {
            previewElement.requestFullscreen();
          } else if (previewElement.msRequestFullscreen) {
            previewElement.msRequestFullscreen();
          } else if (previewElement.mozRequestFullScreen) {
            previewElement.mozRequestFullScreen();
          } else if (previewElement.webkitRequestFullscreen) {
            previewElement.webkitRequestFullscreen();
          }

          // Add listeners in case user presses escape key
          document.addEventListener('webkitfullscreenchange', this.escapeFullscreen);
          document.addEventListener('mozfullscreenchange', this.escapeFullscreen);
          document.addEventListener('fullscreenchange', this.escapeFullscreen);
          document.addEventListener('MSFullscreenChange', this.escapeFullscreen);
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        }
      },
    },
    methods: {
      checkFullscreen() {
        return !(
          (document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
          (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
          (document.mozFullScreen !== undefined && !document.mozFullScreen) ||
          (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen)
        );
      },
      escapeFullscreen() {
        if (!this.checkFullscreen()) {
          this.fullscreen = false;
          document.removeEventListener('webkitfullscreenchange', this.escapeFullscreen);
          document.removeEventListener('mozfullscreenchange', this.escapeFullscreen);
          document.removeEventListener('fullscreenchange', this.escapeFullscreen);
          document.removeEventListener('MSFullscreenChange', this.escapeFullscreen);
        }
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
