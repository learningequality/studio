<template>

  <VLayout :key="fileId" :class="{fullscreen: fullscreen, renderer: loading}">
    <VCard v-if="!file" color="grey lighten-4" flat>
      <VLayout align-center justify-center fill-height>
        {{ $tr('noFileText') }}
      </VLayout>
    </VCard>
    <VCard v-else-if="uploading" color="grey lighten-4" flat>
      <VLayout align-center justify-center fill-height data-test="progress">
        <FileStatus :fileIDs="[file.id]" large />
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
      v-else-if="isHTML"
      :src="htmlPath"
      sandbox="allow-scripts"
      @load="loading = false"
    ></iframe>
    <embed v-else-if="isPDF" :src="src" @load="loading = false">
    <VCard v-else color="grey lighten-4" flat>
      <VLayout align-center justify-center fill-height data-test="not-supported">
        {{ $tr('previewNotSupported') }}
      </VLayout>
    </VCard>
  </VLayout>

</template>

<script>

  import { mapGetters } from 'vuex';
  import FileStatus from './FileStatus.vue';

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
      fullscreen: {
        type: Boolean,
        default: false,
      },
      supplementaryFileIds: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    data() {
      return {
        loading: true,
      };
    },
    computed: {
      ...mapGetters('file', ['getFile', 'getFiles']),
      file() {
        return this.getFile(this.fileId);
      },
      supplementaryFiles() {
        return this.getFiles(this.supplementaryFileIds);
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
        return '/zipcontent/' + this.file.checksum + '.' + this.file.file_format;
      },
      src() {
        return this.file && this.file.url;
      },
      uploading() {
        return this.file.progress !== undefined;
      },
    },
    watch: {
      fileId(newFileId) {
        this.loading = Boolean(newFileId);
      },
    },
    $trs: {
      noFileText: 'Select a file to preview',
      previewNotSupported: 'No preview available for this file',
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

</style>
