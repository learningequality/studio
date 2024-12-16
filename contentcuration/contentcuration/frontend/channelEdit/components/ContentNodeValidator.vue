<template>

  <span v-if="noTitle && !hideTitleValidation" class="red--text title">
    <VIconWrapper color="red">error</VIconWrapper>
    <span class="mx-1">
      {{ $tr('missingTitle') }}
    </span>
  </span>
  <span v-else-if="error" class="mx-2">
    <VTooltip bottom lazy>
      <template #activator="{ on }">
        <VIconWrapper :color="$themePalette.red.v_600" v-on="on">
          error
        </VIconWrapper>
      </template>
      <span>{{ error }}</span>
    </VTooltip>
  </span>
  <span v-else-if="warning" class="mx-2">
    <VTooltip bottom lazy>
      <template #activator="{ on }">
        <VIconWrapper :color="$themePalette.yellow.v_600" v-on="on">
          warning
        </VIconWrapper>
      </template>
      <span>{{ warning }}</span>
    </VTooltip>
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
  .v-icon {
    vertical-align: bottom;
    cursor: default;
  }
</style>
