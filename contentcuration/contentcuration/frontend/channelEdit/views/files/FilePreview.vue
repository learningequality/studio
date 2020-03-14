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
  import { FormatPresets } from 'shared/constants';
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
          FormatPresets.filter(f => f.display && !f.supplementary).flatMap(f => f.allowed_formats)
        );
        return availablePreviewFormats.includes(this.file.file_format);
      },
      isAudio() {
        return this.file.file_format === 'mp3';
      },
      showFullscreenOption() {
        return (
          this.file && this.file.url && this.isPreviewable && !this.isAudio && !this.file.uploading
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
