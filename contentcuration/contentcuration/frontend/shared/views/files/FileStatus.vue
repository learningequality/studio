<template>

  <div>
    <VTooltip v-if="hasErrors" top>
      <template v-slot:activator="{ on }">
        <Icon color="red" :large="large" v-on="on">
          error
        </Icon>
      </template>
      <span>{{ getStatusMessage(file) }}</span>
    </VTooltip>
    <Icon
      v-else-if="progress >= 1"
      :large="large"
      color="greenSuccess"
      data-test="done"
    >
      check_circle
    </Icon>
    <VProgressCircular
      v-else
      :size="large ? 60 : 20"
      :width="large ? 8 : 4"
      :value="progress * 100"
      color="greenSuccess"
      rotate="270"
      data-test="progress"
    />
  </div>

</template>

<script>

  import useFiles from 'shared/composables/useFiles';

  export default {
    name: 'FileStatus',
    props: {
      file: {
        type: Object,
        required: true,
      },
      large: {
        type: Boolean,
        default: false,
      },
    },
    setup() {
      const { getErrorMessage, getStatusMessage } = useFiles();
      return { getErrorMessage, getStatusMessage };
    },
    computed: {
      progress() {
        return this.file && this.file.progress;
      },
      hasErrors() {
        return Boolean(this.file && this.getErrorMessage(this.file));
      },
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    cursor: default;
  }

</style>
