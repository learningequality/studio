<template>

  <span v-if="error">
    <span v-if="noTitle" class="red--text">
      <Icon color="red">error</Icon>
      <span class="mx-1">
        {{ $tr('missingTitle') }}
      </span>
    </span>
    <span v-else>
      <VTooltip bottom>
        <template #activator="{ on }">
          <Icon color="red" v-on="on">error</Icon>
        </template>
        <span>{{ error }}</span>
      </VTooltip>
    </span>
  </span>

</template>
<script>

  import { validationMixin } from '../mixins';

  export default {
    name: 'ContentNodeValidator',
    mixins: [validationMixin],
    props: {
      node: {
        type: Object,
      },
    },
    computed: {
      error() {
        if (this.invalid) {
          return this.$tr('incompleteText');
        } else if (this.node.error_count) {
          return this.$tr('incompleteDescendantsText', { count: this.node.error_count });
        }
        return '';
      },
    },
    $trs: {
      incompleteText: 'Incomplete',
      missingTitle: 'Missing title',
      incompleteDescendantsText:
        '{count, number, integer} {count, plural, one {resource is incomplete} other {resources are incomplete}}',
    },
  };

</script>

<style scoped>
  .v-icon {
    vertical-align: bottom;
    cursor: default;
  }
</style>
