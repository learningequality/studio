<template>

  <div :style="{ cursor: copying && !hasCopyingErrored ? 'progress' : 'default' }">
    <VProgressCircular
      v-if="copying && !hasCopyingErrored"
      indeterminate
      :color="progressBarColor"
      v-bind="$attrs"
    />
    <VTooltip
      v-else-if="hasCopyingErrored && showTooltip"
      bottom
      lazy
    >
      <template #activator="{ on }">
        <VIconWrapper
          color="red"
          v-on="on"
        >
          error
        </VIconWrapper>
      </template>
      <span>{{ $tr('copyErrorTopic') }}</span>
    </VTooltip>
    <VIconWrapper
      v-else-if="hasCopyingErrored && !showTooltip"
      color="red"
    >
      error
    </VIconWrapper>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'ContentNodeCopyTaskProgress',
    props: {
      node: {
        type: Object,
        required: true,
      },
      showTooltip: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('contentNode', ['isNodeInCopyingState', 'hasNodeCopyingErrored']),
      copying() {
        return this.isNodeInCopyingState(this.node.id);
      },
      hasCopyingErrored() {
        return this.hasNodeCopyingErrored(this.node.id);
      },
      progressBarColor() {
        return this.$themeTokens.loading;
      },
    },
    $trs: {
      copyErrorTopic: 'Some resources failed to copy',
    },
  };

</script>
