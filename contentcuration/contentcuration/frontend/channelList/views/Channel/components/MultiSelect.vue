<template>

  <VSelect
    v-model="selections"
    :items="items"
    multiple
    outline
    clearable
    chips
    :menu-props="menuProps"
    v-bind="$attrs"
    @click.stop.prevent
  />

</template>


<script>

  export default {
    name: 'MultiSelect',
    props: {
      value: {
        type: Array,
        default() {
          return [];
        },
      },
      items: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    computed: {
      selections: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value.filter(Boolean));
        },
      },
      menuProps() {
        return { offsetY: true, maxHeight: 270 };
      },
    },
  };

</script>

<style lang="less" scoped>

  /deep/ .v-select__selections {
    width: calc(100% - 48px);
    min-height: 0 !important;
  }
  .v-chip,
  /deep/ .v-chip__content,
  .text-truncate {
    max-width: 100%;
  }

</style>
