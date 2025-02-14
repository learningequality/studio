<template>

  <div v-if="nodes">
    {{ $tr('templateString', { count: nodes.length }) }}
  </div>

</template>

<script>

  export default {
    name: 'Template',
    computed: {
      nodes() {
        return window.nodes;
      },
    },
    $trs: {
      templateString:
        'You have {count, plural,\n =1 {# node for testing}\n other {# nodes for testing}}',
    },
  };

</script>

<style lang="scss" scoped>

</style>
