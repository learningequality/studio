<template>

  <div>
    <template v-if="hasErrors">
      <KIcon
        ref="error"
        icon="error"
        :style="{ fontSize: large ? '32px' : '20px' }"
      />
      <KTooltip
        reference="error"
        placement="top"
        :refs="$refs"
      >
        {{ statusMessage(id) }}
      </KTooltip>
    </template>
    <KIcon
      v-else-if="progress >= 1"
      icon="correct"
      data-test="done"
      :style="{ fontSize: large ? '32px' : '20px' }"
    />
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
