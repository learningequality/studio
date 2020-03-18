<template>

  <span v-if="invalidFile" class="red--text" data-test="error">
    {{ message }}
    <ActionLink
      v-if="showSelectFile"
      data-test="upload"
      :text="$tr('selectFile')"
      class="ml-2"
      @click="$emit('open')"
    />
  </span>
  <span v-else-if="uploading" class="grey--text" data-test="progress">
    {{ message }}
  </span>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { fileErrors } from 'shared/views/files/constants';
  import { fileStatusMixin } from 'shared/views/files/mixins';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';

  export default {
    name: 'FileStatusText',
    components: {
      ActionLink,
    },
    mixins: [fileStatusMixin],
    props: {
      fileIds: {
        type: Array,
        default() {
          return [];
        },
      },
      readonly: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('file', ['getFiles', 'getUploadsInProgress']),
      files() {
        return this.getFiles(this.fileIds);
      },
      invalidFile() {
        return this.files.find(f => f.error);
      },
      uploading() {
        return this.getUploadsInProgress(this.fileIds).length;
      },
      message() {
        return this.statusMessage([this.fileIds]);
      },
      showSelectFile() {
        return !this.readonly && this.invalidFile.error.type !== fileErrors.NO_STORAGE;
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
