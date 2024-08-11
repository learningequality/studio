<template>

  <KLabeledIcon
    v-if="noTitle && !hideTitleValidation"
    icon="error"
    class="icon"
    :color="$themeTokens.error"
    :style="{ fontSize: '20px' }"
  >
    <span :style="{ color: $themeTokens.error }">
      {{ $tr('missingTitle') }}
    </span>
  </KLabeledIcon>
  <span v-else-if="error">
    <KIcon
      ref="error"
      icon="error"
      class="icon"
      :aria-label="error"
      :style="{ fontSize: '20px', marginLeft: '16px' }"
    />
    <KTooltip
      reference="error"
      :refs="$refs"
      placement="bottom"
      appendToRoot
    >
      {{ error }}
    </KTooltip>
  </span>
  <span v-else-if="warning">
    <KIcon
      ref="warning"
      icon="warningIncomplete"
      :aria-label="warning"
      class="icon"
      :style="{ fontSize: '20px', marginLeft: '16px' }"
    />
    <KTooltip
      reference="warning"
      :refs="$refs"
      placement="bottom"
      appendToRoot
    >
      {{ warning }}
    </KTooltip>
  </span>

</template>
<script>

  export default {
    name: 'ContentNodeValidator',
    props: {
      node: {
        type: Object,
        default: null,
      },
      hideTitleValidation: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      noTitle() {
        return !this.node.title;
      },
      warning() {
        return this.node.error_count
          ? this.$tr('incompleteDescendantsText', { count: this.node.error_count })
          : '';
      },
      error() {
        if (!this.node.complete) {
          return this.$tr('incompleteText');
        } else if (this.node.total_count && this.node.error_count >= this.node.total_count) {
          return this.$tr('allIncompleteDescendantsText', { count: this.node.error_count });
        }
        return '';
      },
    },
    $trs: {
      incompleteText: 'Incomplete',
      missingTitle: 'Missing title',
      incompleteDescendantsText:
        '{count, number, integer} {count, plural, one {resource is incomplete} other {resources are incomplete}}',
      allIncompleteDescendantsText:
        '{count, plural, one {{count, number, integer} resource is incomplete and cannot be published} other {All {count, number, integer} resources are incomplete and cannot be published}}',
    },
  };

</script>

<style scoped>
  .icon {
    cursor: default;
  }
</style>
