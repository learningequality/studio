<template>

  <VCard
    ref="thumbnail"
    data-test="loading"
    color="grey lighten-4"
    style="padding: 28% 0;"
    flat
  >
    <VLayout wrap align-center justify-center style="max-height: 0px;">
      <div class="text-xs-center" style="position: absolute;">
        <p>
          <FileStatus :fileIDs="[fileId]" large data-test="progress" />
        </p>
        <ActionLink
          v-if="!file.error"
          :text="$tr('cancel')"
          data-test="cancel-upload"
          @click="$emit('cancel')"
        />
      </div>
    </VLayout>
  </VCard>

</template>

<script>

  import { mapGetters } from 'vuex';
  import ActionLink from '../ActionLink';
  import FileStatus from 'frontend/channelEdit/views/files/FileStatus';

  export default {
    name: 'FileStatusCard',
    components: {
      ActionLink,
      FileStatus,
    },
    props: {
      fileId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('file', ['getFiles']),
      file() {
        return this.getFiles([this.fileId])[0];
      },
    },
    $trs: {
      cancel: 'Cancel',
    },
  };

</script>

<style lang="less" scoped>

  /deep/ canvas {
    border: 4px solid var(--v-grey-darken2);
  }

</style>
