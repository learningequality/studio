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
        @blur="resetScroll"
      >
        <template #selection="{ item }">
          <StudioChip 
            :class="{ notranslate }"
            @input="parent.selectItem(item)"
          >
            {{ item.text }}
          </StudioChip>
        </template>
        <template #item="{ item }">
          <KCheckbox
            :ref="'checkbox-' + item.value"
            :checked="selections.includes(item.value)"
            :value="item.value"
            class="scroll-margin"
          >
            <span
              :class="{ notranslate }"
              :style="getEllipsisStyle()"
              dir="auto"
            >
              {{ item.text }}
            </span>
          </KCheckbox>
        </template>
      </VSelect>
    </template>
  </DropdownWrapper>

</template>


<script>
  import DropdownWrapper from './DropdownWrapper';
  import StudioChip from '../StudioChip.vue';

  export default {
    name: 'MultiSelect',
    components: {  DropdownWrapper, StudioChip },
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
      resetScroll() {
        const [{ value: firstItemValue } = {}] = this.items || [];
        if (!firstItemValue) {
          return;
        }
        const firstItem = this.$refs[`checkbox-${firstItemValue}`];
        if (!firstItem) {
          return;
        }
        firstItem.$el.scrollIntoView();
      },
    },
    $trs: {
      noItemsFound: 'No items found',
    },
  };

</script>


<style lang="scss" scoped>

  .v-select {
    max-width: 500px;
  }

  ::v-deep .v-select__selections {
    width: calc(100% - 48px);
    min-height: 0 !important;
  }

  .v-chip,
  ::v-deep .v-chip__content,
  .text-truncate {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
  }

  .scroll-margin {
    /* Fixes scroll position on reset scroll */
    scroll-margin: 16px;
  }

</style>
