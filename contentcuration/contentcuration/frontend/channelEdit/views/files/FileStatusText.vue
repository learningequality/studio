<template>

  <span v-if="uploading" class="grey--text">
    {{ message }}
  </span>
  <span v-else-if="invalidFile" class="red--text">
    {{ message }}
    <ActionLink
      v-if="showSelectFile"
      :text="$tr('selectFile')"
      class="ml-2"
      @click="$emit('open')"
    />
  </span>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { fileErrors } from '../../constants';
  import { fileStatusMixin } from './mixins';
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
      invalidFile() {
        return this.getFiles(this.fileIds).find(f => f.error);
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
