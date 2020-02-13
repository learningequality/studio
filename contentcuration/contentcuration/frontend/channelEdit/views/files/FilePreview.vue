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
          {{ node.title }}
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
        :key="fileId"
        :fileId="fileId"
        :fullscreen="fullscreen"
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
  import _ from 'underscore';
  import ContentRenderer from './ContentRenderer.vue';
  import Constants from 'edit_channel/constants/index';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink.vue';

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
      node: {
        type: Object,
        required: true,
        validator: node => {
          return node.files && node.title;
        },
      },
    },
    data() {
      return {
        fullscreen: false,
      };
    },
    computed: {
      ...mapGetters('file', ['getFile']),
      file() {
        return this.getFile(this.fileId);
      },
      isPreviewable() {
        let availablePreviewFormats = _.chain(Constants.FormatPresets)
          .filter(f => f.display && !f.supplementary)
          .pluck('allowed_formats')
          .flatten()
          .uniq()
          .value();
        return availablePreviewFormats.includes(this.file.file_format);
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
