<template>

  <VLayout :key="file && file.file_on_disk" :class="{fullscreen: fullscreen, renderer: loading}">
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
        @load="loading = false"
      >
        <source :src="src" :type="file.mimetype">
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
  import FileStatus from 'edit_channel/file_upload/views/FileStatus.vue';

  export default {
    name: 'ContentRenderer',
    components: {
      FileStatus,
    },
    props: {
      file: {
        type: Object,
      },
      fullscreen: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        src: null,
        loading: true,
      };
    },
    computed: {
      ...mapGetters('fileUploads', ['getFile']),
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
      uploading() {
        return !!this.getFile(this.file.id);
      },
    },
    watch: {
      file: {
        handler(newFile) {
          this.src = newFile && newFile.file_on_disk;
          this.loading = true;
        },
        deep: true,
      },
    },
    $trs: {
      noFileText: 'Select a file to preview',
      previewNotSupported: 'No preview available for this file',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

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
