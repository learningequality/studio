<template>

  <span v-if="invalidFile" class="red--text" data-test="error">
    <ActionLink
      v-if="showSelectFile"
      data-test="upload"
      :text="$tr('selectFile')"
      class="mr-2"
      @click="$emit('open')"
    />
    {{ message }}
  </span>
  <span v-else-if="uploading" class="grey--text" data-test="progress">
    {{ message }}
  </span>
  <span v-else-if="permanent" class="grey--text">
    <ActionLink
      :text="$tr('selectFile')"
      class="mr-2"
      @click="$emit('open')"
    />
    {{ file.original_filename }}
  </span>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { fileStatusMixin } from 'shared/mixins';
  import { fileErrors } from 'shared/constants';

  export default {
    name: 'FileStatusText',
    mixins: [fileStatusMixin],
    props: {
      fileId: {
        type: String,
        required: true,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      // Always show some status
      permanent: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('file', ['getFileUpload']),
      file() {
        return this.getFileUpload(this.fileId);
      },
      uploading() {
        return this.file && this.file.uploading;
      },
      message() {
        return this.statusMessage(this.fileId);
      },
      invalidFile() {
        return this.file && this.file.error;
      },
      showSelectFile() {
        return !this.readonly && this.file && this.file.error !== fileErrors.NO_STORAGE;
      },
    },
    $trs: {
      selectFile: 'Select file',
    },
  };

</script>

<style lang="scss" scoped>

  ::v-deep canvas {
    border: 2px solid var(--v-grey-darken2);
  }

</style>
