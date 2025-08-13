<template>

  <VScaleTransition origin="center center">
    <VCard
      ref="preview"
      tabindex="0"
      :dark="fullscreen && !isZip"
      flat
      class="preview-area"
      app
    >
      <VToolbar
        v-if="fullscreen"
        dark
        color="grey darken-3"
        dense
      >
        <VToolbarTitle class="notranslate">
          {{ nodeTitle }}
        </VToolbarTitle>
      </VToolbar>
      <VToolbar
        v-if="fullscreen"
        light
        dense
      >
        {{ $tr('fullscreenModeText') }}
        <VSpacer />
        <VBtn
          data-test="closefullscreen"
          flat
          @click="fullscreen = false"
        >
          {{ $tr('exitFullscreen') }}
        </VBtn>
      </VToolbar>
      <ContentRenderer
        :nodeId="nodeId"
        :fileId="fileId"
        :fullscreen="fullscreen"
      />
      <p
        v-if="!fullscreen"
        class="mt-2"
      >
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

  import fromPairs from 'lodash/fromPairs';
  import flatMap from 'lodash/flatMap';
  import { mapGetters } from 'vuex';
  import ContentRenderer from './ContentRenderer';
  import { FormatPresetsList } from 'shared/leUtils/FormatPresets';

  const availablePreviewFormats = fromPairs(
    flatMap(
      FormatPresetsList.filter(f => f.display && !f.supplementary),
      f => f.allowed_formats,
    ).map(allowedFormat => [allowedFormat, allowedFormat]),
  );

  export default {
    name: 'FilePreview',
    components: {
      ContentRenderer,
    },
    props: {
      fileId: {
        type: String,
        required: false,
        default: null,
      },
      nodeId: {
        type: String,
        required: false,
        default: null,
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
      ...mapGetters('file', ['getContentNodeFileById']),
      ...mapGetters('contentNode', ['getContentNode']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      file() {
        return this.getContentNodeFileById(this.nodeId, this.fileId);
      },
      nodeTitle() {
        return this.node && this.node.title;
      },
      isPreviewable() {
        return Boolean(availablePreviewFormats[this.file.file_format]);
      },
      isAudio() {
        return this.file.file_format === 'mp3';
      },
      isZip() {
        return this.file.file_format === 'zip';
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
          const previewElement = this.$refs.preview.$el;
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

        this.$emit('fullscreen', isFullscreen);
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
      viewFullscreen: 'View fullscreen',
      exitFullscreen: 'Exit fullscreen',
      fullscreenModeText: 'Fullscreen mode',
    },
  };

</script>


<style lang="scss" scoped>

  .preview-area {
    outline: none;
  }

</style>
