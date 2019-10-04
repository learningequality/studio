<template>
  <VLayout :key="file && file.file_on_disk" :class="{fullscreen: fullscreen, renderer: loading}">
    <VCard v-if="!file" color="grey lighten-4" flat>
      <VLayout alignCenter justifyCenter fillHeight>
        {{ $tr('noFileText') }}
      </VLayout>
    </VCard>
    <VCard v-else-if="file.error" color="grey lighten-4" flat>
      <VLayout alignCenter justifyCenter fillHeight>
        <VIcon size="32px" color="red">
          error
        </VIcon>
      </VLayout>
    </VCard>
    <VCard v-else-if="isPending" color="grey lighten-4" flat>
      <VLayout alignCenter justifyCenter fillHeight>
        <VIcon size="32px" color="grey">
          query_builder
        </VIcon>
      </VLayout>
    </VCard>
    <VCard v-else-if="isUploading || !file.file_on_disk" color="grey lighten-4" flat>
      <VLayout alignCenter justifyCenter fillHeight>
        <v-progress-circular
          slot="activator"
          size="28"
          :value="file.progress"
          color="greenSuccess"
          rotate="270"
        />
      </VLayout>
    </VCard>
    <video
      v-else-if="isVideo"
      controls
      preload="metadata"
      controlsList="nodownload"
      @load="loading = false"
    >
      <source :src="src" :type="file.mimetype">
    </video>
    <VCard v-else-if="isAudio" flat>
      <VLayout alignCenter fillHeight>
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
      <VLayout alignCenter justifyCenter fillHeight>
        {{ $tr('previewNotSupported') }}
      </VLayout>
    </VCard>
  </VLayout>
</template>

<script>

  export default {
    name: 'ContentRenderer',
    $trs: {
      noFileText: 'Select a file to preview',
      previewNotSupported: 'No preview available for this file',
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
      isPending() {
        return this.file.progress === 0;
      },
      isUploading() {
        return this.file.progress && this.file.progress < 100;
      },
      htmlPath() {
        return '/zipcontent/' + this.file.checksum + '.' + this.file.file_format;
      },
    },
    watch: {
      file(newFile) {
        this.src = newFile && newFile.file_on_disk;
        this.loading = true;
      },
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
  }

  .renderer {
    background: url('/static/img/kolibri_load.gif') no-repeat center;
    background-size: 150px auto;
  }

</style>
