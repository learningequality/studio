<template>

  <DropdownWrapper :menuHeight="270">
    <template #default="{ attach, menuProps }">
      <VSelect
        v-model="selections"
        :items="items"
        multiple
        :box="box"
        clearable
        chips
        :no-data-text="$tr('noItemsFound')"
        :menu-props="{ ...menuProps, zIndex: 300 }"
        :attach="attach"
        v-bind="$attrs"
        @click.stop.prevent
      >
        <template #selection="{ item }">
          <VChip :class="{ notranslate }">
            {{ getText(item) }}
          </VChip>
        </template>
        <template #item="{ item, tile }">
          <KCheckbox
            :checked="selections.includes(item)"
            :label="getText(item)"
            :value="item"
            :style="getEllipsisStyle()"
            :ripple="false"
          />
        </template>
      </VSelect>
    </template>
  </DropdownWrapper>

</template>


<script>

  import Checkbox from './Checkbox';
  import DropdownWrapper from './DropdownWrapper';

  export default {
    name: 'MultiSelect',
    components: { Checkbox, DropdownWrapper },
    // $attrs are rebound to a descendent component
    inheritAttrs: false,
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
        required: true,
      },
      notranslate: {
        type: Boolean,
        default: false,
      },
      box: {
        type: Boolean,
        default: true,
      },
      useEllipsis: {
        type: Boolean,
        default: false,
      },
      ellipsisMaxWidth: {
        type: String,
        default: '200px',
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
    },
    methods: {
      getEllipsisStyle() {
        return this.useEllipsis
          ? {
              maxWidth: this.ellipsisMaxWidth,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }
          : {};
      },
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
    overflow: hidden;
    white-space: nowrap;
  }

</style>
