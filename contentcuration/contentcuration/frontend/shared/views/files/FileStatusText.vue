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

  import useFiles from 'shared/composables/useFiles';
  import { fileErrors } from 'shared/constants';

  export default {
    name: 'FileStatusText',
    props: {
      file: {
        type: Object,
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
    setup() {
      const { getStatusMessage } = useFiles();
      return { getStatusMessage };
    },
    computed: {
      uploading() {
        return this.file && this.file.uploading;
      },
      message() {
        return this.getStatusMessage(this.file);
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

<style lang="less" scoped>

  /deep/ canvas {
    border: 2px solid var(--v-grey-darken2);
  }

</style>
