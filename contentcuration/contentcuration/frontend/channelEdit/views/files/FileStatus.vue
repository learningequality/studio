<template>

  <div>
    <div v-if="!uploads.length">
      <slot></slot>
    </div>
    <VTooltip v-else-if="hasErrors" top>
      <template v-slot:activator="{ on }">
        <Icon color="red" :large="large" v-on="on">
          error
        </Icon>
      </template>
      <span>{{ statusMessage(fileIDs) }}</span>
    </VTooltip>
    <Icon
      v-else-if="progress >= 100"
      :large="large"
      color="greenSuccess"
      data-test="done"
    >
      check_circle
    </Icon>
    <VProgressCircular
      v-else
      :size="large? 60 : 20"
      :width="large? 8: 4"
      :value="progress"
      color="greenSuccess"
      rotate="270"
      data-test="progress"
    />
  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { fileSizeMixin, fileStatusMixin } from './mixins';

  export default {
    name: 'FileStatus',
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      fileIDs: {
        type: Array,
        default() {
          return [];
        },
      },
      large: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('file', ['getProgress', 'getFiles']),
      files() {
        return this.getFiles(this.fileIDs);
      },
      uploads() {
        return this.files.filter(f => f.progress !== undefined);
      },
      progress() {
        let progress = this.getProgress(this.fileIDs);
        return (progress.uploaded / (progress.total || 1)) * 100;
      },
      hasErrors() {
        return this.files.some(u => u.error);
      },
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    cursor: default;
  }

</style>
