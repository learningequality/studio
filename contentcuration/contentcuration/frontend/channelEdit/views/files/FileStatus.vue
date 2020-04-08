<template>

  <div>
    <VTooltip v-if="hasErrors" top>
      <template v-slot:activator="{ on }">
        <Icon color="red" :large="large" v-on="on">
          error
        </Icon>
      </template>
      <span>{{ statusMessage(checksum) }}</span>
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
  import { fileSizeMixin, fileStatusMixin } from 'shared/mixins';

  export default {
    name: 'FileStatus',
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      checksum: {
        type: String,
        required: true,
      },
      large: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('file', ['getFileUpload']),
      progress() {
        const file = this.getFileUpload(this.checksum);
        return file && file.progress;
      },
      hasErrors() {
        return Boolean(this.errorMessage(this.checksum));
      },
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    cursor: default;
  }

</style>
