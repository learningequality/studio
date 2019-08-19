<template>
  <div
    class="wrapper"
    :style="highlight && !readonly ? { borderColor: 'purple' } : {}"
    @dragenter.prevent="enter"
    @dragover.prevent="over"
    @dragleave.prevent="leave"
    @drop.prevent="drop"
  >
    <template
      v-for="f in files"
    >
      <VProgressCircular
        v-if="f.progress < 100"
        :key="f.id"
        :size="50"
        :width="15"
        :value="f.progress"
      >
        {{ f.progress }}
      </VProgressCircular>
    </template>
    <input
      v-if="!readonly"
      id="file-elem"
      ref="fileUpload"
      style="display: none;"
      type="file"
      :accept="acceptedFiles"
      @change="handleFiles($event.target.files)"
    >
    <label for="fileElem">
      <VImg v-if="f" contain :src="f" />
      <VImg v-else contain />
      <VBtn v-if="!readonly" v-bind="$attrs" @click="$refs.fileUpload.click()">
        {{ $tr('fileUpload') }}
      </VBtn>
    </label>
  </div>
</template>

<script>

  import client from './client';

  export default {
    name: 'Uploader',
    $trs: {
      fileUpload: 'Upload file',
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
        default: '*',
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
    label {
      width: 100%;
    }
  }

</style>
