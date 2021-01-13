<template>

  <VSelect
    v-model="selections"
    :items="items"
    multiple
    :box="box"
    clearable
    chips
    :no-data-text="$tr('noItemsFound')"
    :menu-props="menuProps"
    v-bind="$attrs"
    @click.stop.prevent
  >
    <template #selection="{ item }">
      <VChip :class="{ notranslate }">
        {{ getText(item) }}
      </VChip>
    </template>
    <template #item="{ item, tile }">
      <Checkbox v-bind="tile.props" class="ma-0">
        <template #label>
          <span :class="{ notranslate }">{{ getText(item) }}</span>
        </template>
      </Checkbox>
    </template>
  </VSelect>

</template>


<script>

  import Checkbox from './Checkbox';

  export default {
    name: 'MultiSelect',
    components: { Checkbox },
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
      itemText: {
        type: [String, Function],
        required: false,
      },
      notranslate: {
        type: Boolean,
        default: false,
      },
      box: {
        type: Boolean,
        default: true,
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
        return { offsetY: true, maxHeight: 270, zIndex: 300 };
      },
    },
    methods: {
      getText(item) {
        if (typeof this.itemText === 'string') {
          return item[this.itemText];
        } else if (typeof this.itemText === 'function') {
          return this.itemText(item);
        }
        return item.text || item;
      },
    },
    $trs: {
      noItemsFound: 'No items found',
    },
  };

</script>

<style lang="less" scoped>

  .v-select {
    max-width: 500px;
  }

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
