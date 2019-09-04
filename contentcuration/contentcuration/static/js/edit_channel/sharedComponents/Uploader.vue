<template>
  <div
    class="wrapper"
    :style="highlight && !readonly ? { backgroundColor: $vuetify.theme.primaryBackground } : {}"
    @dragenter.prevent="enter"
    @dragover.prevent="over"
    @dragleave.prevent="leave"
    @drop.prevent="drop"
  >
    <slot name="upload-zone"></slot>
    <slot name="upload-actions" :openDialog="openUploadDialog"></slot>

    <input
      v-if="!readonly"
      ref="fileUpload"
      style="display: none;"
      type="file"
      :accept="acceptedFiles"
      @change="handleFiles($event.target.files)"
    >
  </div>
</template>

<script>

  import _ from 'underscore';
  import client from './client';
  import Constants from 'edit_channel/constants';

  export default {
    name: 'Uploader',
    $trs: {
      fileUpload: 'Upload file',
      dropFilesText: 'or drop files here',
    },
    props: {
      value: {
        type: Object,
        default() {
          return {};
        },
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      acceptedFiles: {
        type: String,
        default: _.chain(Constants.FormatPresets)
          .where({ supplementary: false })
          .pluck('associated_mimetypes')
          .flatten()
          .value()
          .join(','),
      },
    },
    data() {
      return {
        highlight: false,
        files: [],
      };
    },
    computed: {
      file() {
        if (this.files.length && this.files[0].previewSrc) {
          return this.files[0].previewSrc;
        }
        return this.value.thumbnail_url;
      },
    },
    methods: {
      enter() {
        this.highlight = true;
      },
      over() {
        this.highlight = true;
      },
      leave() {
        this.highlight = false;
      },
      drop(e) {
        this.highlight = false;
        this.handleFiles(e.dataTransfer.files);
      },
      openUploadDialog() {
        this.$refs.fileUpload.click();
      },
      handleFiles(files) {
        if (!this.readonly) {
          [...files].forEach(uploadedFile => {
            const id = String(Math.random()).slice(2);
            const fileDetails = {
              id,
              previewSrc: null,
              progress: null,
            };
            this.files.push(fileDetails);
            const data = new FormData();
            data.append('file', uploadedFile);

            client
              .post(window.Urls.thumbnail_upload(), data, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: progressEvent => {
                  const { loaded, total } = progressEvent;
                  fileDetails.progress = (loaded / total) * 100;
                },
              })
              .then(response => {
                this.$emit('input', {
                  thumbnail: response.data.formatted_filename,
                  thumbnail_url: response.data.encoding || response.data.path,
                  thumbnail_encoding: response.data.encoding,
                });
              })
              .catch(() => {
                /* Error. Inform the user */
              });

            const reader = new FileReader();
            reader.readAsDataURL(uploadedFile);
            reader.onloadend = () => {
              fileDetails.previewSrc = reader.result;
            };
          });
        }
      },
    },
  };

</script>

<style lang="less">
  .wrapper {
    width: 100%;
    height: 100%;
  }

</style>
