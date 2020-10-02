<template>

  <VBadge v-if="badge" color="transparent" right>
    <template v-if="warning || error" #badge>
      <VTooltip bottom>
        <template #activator="{ on }">
          <Icon :color="error? 'red' : 'amber'" size="10" v-on="on">
            lens
          </Icon>
        </template>
        <span>{{ error || warning }}</span>
      </VTooltip>
    </template>
    <slot></slot>
  </VBadge>
  <span v-else-if="noTitle" class="red--text title">
    <Icon color="red">error</Icon>
    <span class="mx-1">
      {{ $tr('missingTitle') }}
    </span>
  </span>
  <span v-else-if="error" class="mx-2">
    <VTooltip bottom>
      <template #activator="{ on }">
        <Icon color="red" v-on="on">
          error
        </Icon>
      </template>
      <span>{{ error }}</span>
    </VTooltip>
  </span>
  <span v-else-if="warning" class="mx-2">
    <VTooltip bottom>
      <template #activator="{ on }">
        <Icon color="amber" v-on="on">
          warning
        </Icon>
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
      },
      badge: {
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
