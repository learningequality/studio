<template>

  <VLayout :key="fileId" :class="{fullscreen, renderer: loading}">
    <VCard v-if="!file" flat class="message-card">
      <VLayout align-center justify-center fill-height>
        {{ $tr('noFileText') }}
      </VLayout>
    </VCard>
    <VCard v-else-if="file.uploading || file.error" flat class="message-card">
      <VLayout align-center justify-center fill-height data-test="progress">
        <FileStatus :checksum="file.checksum" large />
      </VLayout>
    </VCard>
    <VFlex v-else-if="isVideo">
      <video
        controls
        preload="metadata"
        controlsList="nodownload"
        crossOrigin
        @load="loading = false"
      >
        <source :src="src" :type="file.mimetype">
        <track
          v-for="subtitle in subtitles"
          :key="subtitle.id"
          :src="subtitle.file_on_disk"
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
      v-else-if="isHTML"
      :src="htmlPath"
      sandbox="allow-scripts"
      @load="loading = false"
    ></iframe>
    <embed v-else-if="isPDF" :src="src" :type="file.mimetype" @load="loading = false">
    <VCard v-else class="message-card" flat>
      <VLayout align-center justify-center fill-height data-test="not-supported">
        <VTooltip bottom>
          <template #activator="{on}">
            <Icon color="grey lighten-2" large v-on="on">
              visibility_off
            </Icon>
          </template>
          <span>{{ $tr('previewNotSupported') }}</span>
        </VTooltip>
      </VLayout>
    </VCard>
  </VLayout>

</template>

<script>

  import { mapGetters } from 'vuex';
  import FileStatus from 'shared/views/files/FileStatus';

  export default {
    name: 'ContentRenderer',
    components: {
      FileStatus,
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
      supplementaryFiles() {
        let files = this.node ? this.getContentNodeFiles(this.nodeId) : [];
        return files.filter(f => f.preset.supplementary);
      },
      subtitles() {
        return this.supplementaryFiles.filter(f => f.preset.subtitle);
      },
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
      htmlPath() {
        return `/zipcontent/${this.file.checksum}.${this.file.file_format}`;
      },
      src() {
        return this.file && (this.file.file_on_disk || this.file.url);
      },
    },
    watch: {
      fileId(newFileId) {
        this.loading = Boolean(newFileId);
      },
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
  iframe {
    width: 100%;
    outline: none;
  }
  .v-card,
  .v-card > .layout,
  video,
  embed,
  iframe {
    min-height: 200px;
    max-height: @max-height;
  }
  .message-card,
  video,
  embed,
  iframe {
    border-color: var(--v-greyBorder-base) !important;
    border-style: solid;
    border-width: 1px;
  }

  .fullscreen {
    min-height: @max-height;
    .v-card,
    video,
    audio,
    embed,
    iframe {
      min-height: @max-height;
    }
    embed,
    iframe {
      // Make room for scrollbar
      margin-right: 15px;
    }
  }

  .renderer {
    background: url('/static/img/kolibri_load.gif') no-repeat center;
    background-size: 150px auto;
  }

  video::-webkit-media-controls-fullscreen-button {
    display: none;
  }

</style>
