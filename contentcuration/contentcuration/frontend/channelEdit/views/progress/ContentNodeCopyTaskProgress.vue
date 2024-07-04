<template>

  <div :style="{ 'cursor': copying && !hasCopyingErrored ? 'progress' : 'default' }">
    <VProgressCircular
      v-if="copying && !hasCopyingErrored"
      indeterminate
      :color="progressBarColor"
      v-bind="$attrs"
    />
    <template v-else-if="hasCopyingErrored && showTooltip">
      <KIcon
        ref="copyError"
        icon="error"
        :style="{ fontSize: '20px' }"
      />
      <KTooltip
        reference="copyError"
        placement="bottom"
        :refs="$refs"
      >
        {{ $tr('copyErrorTopic') }}
      </KTooltip>
    </template>
    <KIcon
      v-else-if="hasCopyingErrored && !showTooltip"
      icon="error"
      :style="{ fontSize: '20px' }"
    />
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
