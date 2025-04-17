<template>

  <VList v-if="errors && errors.length">
    <VListTile
      v-for="(error, idx) in errors"
      :key="idx"
    >
      <span class="font-weight-medium red--text">{{ error }}</span>
    </VListTile>
  </VList>

</template>

<script>

  export default {
    name: 'ErrorList',
    props: {
      errors: {
        type: Array,
        default: () => [],
      },
    },
  };

</script>

<style lang="scss" scoped>

  ::v-deep .v-list__tile {
    padding-left: 0;
  }

</style>
