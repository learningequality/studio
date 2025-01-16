<template>

  <VLayout :key="fileId" :class="{ fullscreen, renderer: loading }">
    <VCard v-if="!file" flat class="message-card">
      <VLayout align-center justify-center fill-height>
        {{ $tr('noFileText') }}
      </VLayout>
    </VCard>
    <VCard v-else-if="file.uploading || file.error" flat class="message-card">
      <VLayout align-center justify-center fill-height data-test="progress">
        <FileStatus :fileId="file.id" large />
      </VLayout>
    </VCard>
    <VFlex v-else-if="isVideo">
      <video
        controls
        preload="metadata"
        controlsList="nodownload"
        crossOrigin
        @loadeddata="loading = false"
      >
        <source :src="src" :type="file.mimetype">
        <track
          v-for="subtitle in subtitles"
          :key="subtitle.id"
          :src="subtitle.url"
          kind="subtitles"
          :srclang="subtitle.language.id"
          :label="subtitle.language.native_name"
        >
      </video>
    </VFlex>
    <VCard v-else-if="isAudio" flat>
      <VLayout align-center justify-center fill-height>
        <audio controls :src="src" :type="file.mimetype" @loadeddata="loading = false"></audio>
      </VLayout>
    </VCard>
    <iframe
      v-else-if="isHTML || isH5P"
      ref="iframe"
      :src="rooturl"
      sandbox="allow-scripts"
      @load="loading = false"
    ></iframe>
    <embed v-else-if="isPDF" :src="src" :type="file.mimetype" @load="loading = false">
    <div v-else-if="isEpub" class="epub">
      <EpubRenderer :src="src" @load="loading = false" />
    </div>

    <VCard v-else class="message-card" flat>
      <VLayout align-center justify-center fill-height data-test="not-supported">
        <VTooltip bottom lazy>
          <template #activator="{ on }">
            <VIconWrapper color="grey lighten-2" large v-on="on">
              visibility_off
            </VIconWrapper>
          </template>
          <span>{{ $tr('previewNotSupported') }}</span>
        </VTooltip>
      </VLayout>
    </VCard>
  </VLayout>

</template>

<script>

  import uniqBy from 'lodash/uniqBy';
  import sortBy from 'lodash/sortBy';
  import { mapGetters } from 'vuex';
  // eslint-disable-next-line
  import Hashi from 'hashi';
  import urls from './hashi/urls';
  import EpubRenderer from './EpubRenderer';
  import FileStatus from 'shared/views/files/FileStatus';

  export default {
    name: 'ContentRenderer',
    components: {
      FileStatus,
      EpubRenderer,
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
      fullscreen: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        loading: true,
      };
    },
    computed: {
      ...mapGetters('file', ['getContentNodeFileById', 'getContentNodeFiles']),
      file() {
        return this.getContentNodeFileById(this.nodeId, this.fileId);
      },
      rooturl() {
        return urls.hashi();
      },
      supplementaryFiles() {
        const files = this.nodeId ? this.getContentNodeFiles(this.nodeId) : [];
        return files.filter(f => f.preset.supplementary);
      },
      subtitles() {
        const files = this.supplementaryFiles.filter(f => f.preset.subtitle);
        return sortBy(
          uniqBy(files, f => f.language.id),
          f => f.language.id
        );
      },
      isVideo() {
        return this.file.file_format === 'mp4' || this.file.file_format === 'webm';
      },
      isAudio() {
        return this.file.file_format === 'mp3';
      },
      isHTML() {
        return this.file.file_format === 'zip';
      },
      isH5P() {
        return this.defaultFile.extension === 'h5p';
      },
      isPDF() {
        return this.file.file_format === 'pdf';
      },
      isEpub() {
        return this.file.file_format === 'epub';
      },
      src() {
        return this.file && this.file.url;
      },
    },
    watch: {
      fileId(newFileId) {
        this.loading = Boolean(newFileId);
      },
    },
    mounted() {
      const now = Date.now();
      this.hashi = new Hashi({ iframe: this.$refs.iframe, now });
      this.hashi.onStateUpdate(data => {
        this.$emit('updateContentState', data);
      });
      this.hashi.on('navigateTo', message => {
        this.$emit('navigateTo', message);
      });
      this.hashi.on(this.hashi.events.RESIZE, scrollHeight => {
        this.iframeHeight = scrollHeight;
      });
      this.hashi.on(this.hashi.events.LOADING, loading => {
        this.loading = loading;
      });
      this.hashi.on(this.hashi.events.ERROR, err => {
        this.loading = false;
        this.$emit('error', err);
      });
      let storageUrl = this.defaultFile.storage_url;
      if (!this.isH5P) {
        // In the case that this is being routed via a remote URL
        // ensure we preserve that for the zip endpoint.
        const query = this.defaultFile.storage_url.split('?')[1];
        storageUrl = urls.zipContentUrl(
          this.defaultFile.checksum,
          this.defaultFile.extension,
          this.entry
        );
        if (query) {
          storageUrl += '?' + query;
        }
      }

      this.hashi.initialize(
        (this.extraFields && this.extraFields.contentState) || {},
        this.userData || {},
        storageUrl,
        this.defaultFile.checksum
      );
    },
    $trs: {
      noFileText: 'Select a file to preview',
      previewNotSupported: 'Preview unavailable',
    },
  };

</script>

<style lang="less" scoped>

  @max-height: calc(100vh - 96px);

  .v-card,
  video,
  audio,
  embed,
  iframe,
  .epub {
    width: 100%;
    outline: none;
  }

  .v-card,
  .v-card > .layout,
  embed,
  iframe,
  .epub {
    min-height: 200px;
    max-height: @max-height;
  }

  video {
    max-height: @max-height;
  }

  .message-card,
  video,
  embed,
  iframe,
  .epub {
    /* stylelint-disable-next-line custom-property-pattern */
    border-color: var(--v-greyBorder-base) !important;
    border-style: solid;
    border-width: 1px;
  }

  .fullscreen {
    min-height: @max-height;

    .v-card,
    audio,
    embed,
    iframe,
    .epub {
      min-height: @max-height;
    }
  }

  .renderer {
    background: url('./kolibri_load.gif') no-repeat center;
    background-size: 150px auto;
  }

  video::-webkit-media-controls-fullscreen-button {
    display: none;
  }

</style>
