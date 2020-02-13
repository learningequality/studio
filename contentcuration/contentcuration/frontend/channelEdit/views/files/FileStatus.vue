<template>

  <div>
    <div v-if="!uploads.length">
      <slot name="default"></slot>
    </div>
    <VTooltip v-else-if="hasErrors" top>
      <template v-slot:activator="{ on }">
        <Icon color="red" :large="large" v-on="on">
          error
        </Icon>
      </template>
      <span>{{ statusMessage(fileIDs) }}</span>
    </VTooltip>
    <Icon v-else-if="progress >= 100" :large="large" color="greenSuccess">
      check_circle
    </Icon>
    <VProgressCircular
      v-else
      :size="large? 60 : 20"
      :width="large? 8: 4"
      :value="progress"
      color="greenSuccess"
      rotate="270"
    />
  </div>

</template>

<script>

  import _ from 'underscore';
  import { mapState } from 'vuex';
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
      ...mapState('fileUploads', ['files']),
      uploads() {
        return _.chain(this.fileIDs)
          .map(f => this.files[f])
          .reject(f => !f)
          .value();
      },
      progress() {
        let sum = _.reduce(
          this.uploads,
          (sum, file) => {
            return file.progress + sum;
          },
          0
        );
        return sum / (this.uploads.length || 1);
      },
      hasErrors() {
        return _.some(this.uploads, u => u.error);
      },
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    cursor: default;
  }

</style>
