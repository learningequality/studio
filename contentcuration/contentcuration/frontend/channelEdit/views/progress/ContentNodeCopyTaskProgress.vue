<template>

  <div :style="{ 'cursor': hasCopyingErrored ? 'default' : 'progress' }">
    <VProgressCircular
      v-if="copying && !hasCopyingErrored"
      indeterminate
      :color="progressBarColor"
      v-bind="$attrs"
    />
    <VTooltip
      v-else-if="copying && hasCopyingErrored && showTooltip"
      bottom
      lazy
    >
      <template #activator="{ on }">
        <Icon color="red" v-on="on">
          error
        </Icon>
      </template>
      <span>{{ $tr('copyErrorTopic') }}</span>
    </VTooltip>
    <Icon
      v-else-if="copying && hasCopyingErrored && !showTooltip"
      color="red"
    >
      error
    </Icon>
  </div>

</template>


<script>

  import { COPYING_FLAG, COPYING_ERROR_FLAG } from 'shared/data/constants';

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
      copying() {
        return this.node[COPYING_FLAG];
      },
      hasCopyingErrored() {
        return this.node[COPYING_ERROR_FLAG];
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
