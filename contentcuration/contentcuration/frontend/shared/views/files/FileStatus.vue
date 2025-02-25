<template>

  <div>
    <VTooltip
      v-if="hasErrors"
      top
      lazy
    >
      <template #activator="{ on }">
        <VIconWrapper
          color="red"
          :large="large"
          v-on="on"
        >
          error
        </VIconWrapper>
      </template>
      <span>{{ statusMessage(id) }}</span>
    </VTooltip>
    <VIconWrapper
      v-else-if="progress >= 1"
      :large="large"
      color="greenSuccess"
      data-test="done"
    >
      check_circle
    </VIconWrapper>
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

  import { mapGetters } from 'vuex';
  import { fileSizeMixin, fileStatusMixin } from 'shared/mixins';

  export default {
    name: 'FileStatus',
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      fileId: {
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
        const file = this.getFileUpload(this.fileId);
        return file && file.progress;
      },
      hasErrors() {
        return Boolean(this.errorMessage(this.fileId));
      },
    },
  };

</script>


<style lang="scss" scoped>

  .v-icon {
    cursor: default;
  }

</style>
