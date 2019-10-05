<template>
  <div
    :style="highlight && !readonly ? { borderColor: 'purple' } : {}"
    @dragenter.prevent="enter"
    @dragover.prevent="over"
    @dragleave.prevent="leave"
    @drop.prevent="drop"
  >
    <template
      v-for="file in files"
    >
      <VProgressCircular
        v-if="file.progress < 100"
        :key="file.id"
        :size="50"
        :width="15"
        :value="file.progress"
      >
        {{ file.progress }}
      </VProgressCircular>
    </template>
    <input
      v-if="!readonly"
      id="fileElem"
      ref="fileUpload"
      style="display: none;"
      type="file"
      accept="image/jpg,image/png"
      @change="handleFiles($event.target.files)"
    >
    <label for="fileElem">
      <VImg v-if="file" contain :src="file" />
      <VImg v-else contain :src="require('../images/kolibri-logo.svg')" />
      <VBtn v-if="!readonly" @click="$refs.fileUpload.click()">
        {{ $tr('fileUpload') }}
      </VBtn>
    </label>
  </div>
</template>

<script>

  import client from 'shared/client';

  export default {
    name: 'ThumbnailUpload',
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
          [...files].forEach(file => {
            const id = String(Math.random()).slice(2);
            const fileDetails = {
              id,
              previewSrc: null,
              progress: null,
            };
            this.files.push(fileDetails);
            const data = new FormData();
            data.append('file', file);

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
            reader.readAsDataURL(file);
            reader.onloadend = () => {
              fileDetails.previewSrc = reader.result;
            };
          });
        }
      },
    },
  };

</script>
