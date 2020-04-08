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
  import { fileStatusMixin } from 'shared/mixins';
  import { fileErrors } from 'shared/constants';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';

  export default {
    name: 'FileStatusText',
    components: {
      ActionLink,
    },
    mixins: [fileStatusMixin],
    props: {
      checksum: {
        type: String,
        required: true,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('file', ['getFileUpload']),
      file() {
        return this.getFileUpload(this.checksum);
      },
      uploading() {
        return this.file.progress < 1;
      },
      message() {
        return this.statusMessage(this.checksum);
      },
      showSelectFile() {
        return !this.readonly && this.file.error !== fileErrors.NO_STORAGE;
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
