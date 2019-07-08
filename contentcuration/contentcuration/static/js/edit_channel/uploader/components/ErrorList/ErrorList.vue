<template>
  <VList v-if="errors && errors.length">
    <VListTile
      v-for="(error, idx) in errors"
      :key="idx"
    >
      <span class="red--text font-weight-medium">{{ error }}</span>
    </VListTile>
  </VList>
</template>

<script>

  export default {
    name: 'ErrorList',
    props: {
      errors: {
        type: Array,
      },
    },
  };

</script>

<style lang="less" scoped>

/deep/ .v-list__tile {
  padding-left: 0;
}

</style>
