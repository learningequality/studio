<template>

  <div>
    <DropdownWrapper>
      <template #default="{ attach, menuProps }">
        <VAutocomplete
          :value="autocompleteValues"
          :items="categoriesList"
          :searchInput.sync="categoryText"
          :label="translateMetadataString('category')"
          box
          clearable
          chips
          deletableChips
          multiple
          item-value="value"
          item-text="text"
          :menu-props="{
            ...menuProps,
            zIndex: 4,
            height: expanded ? 0 : 'auto',
            maxHeight: expanded ? 0 : 300,
          }"
          :attach="attach"
          @click:clear="$nextTick(() => removeAll())"
        >
          <template #selection="data">
            <VTooltip
              bottom
              lazy
            >
              <template #activator="{ on, attrs }">
                <VChip
                  v-bind="attrs"
                  :close="!data.item.undeletable"
                  v-on="on"
                  @input="remove(data.item.value)"
                >
                  {{ data.item.text }}
                </VChip>
              </template>
              <div>
                <div>{{ tooltipText(data.item.value) }}</div>
              </div>
            </VTooltip>
          </template>

          <template #no-data>
            <VListTile v-if="categoryText && categoryText.trim()">
              <VListTileContent>
                <VListTileTitle>
                  {{ $tr('noCategoryFoundText', { text: categoryText.trim() }) }}
                </VListTileTitle>
              </VListTileContent>
            </VListTile>
          </template>

          <template #item="{ item }">
            <VListTile
              :value="isSelected(item.value)"
              :class="{ parentOption: !item.value.includes('.') }"
              @mousedown.prevent
              @click="onChange(item.value)"
            >
              <KCheckbox
                :checked="isSelected(item.value)"
                :label="item.text"
                :value="item.value"
                style="margin-top: 10px"
                :style="treeItemStyle(item)"
                :ripple="false"
              />
            </VListTile>
          </template>
        </VAutocomplete>
      </template>
    </DropdownWrapper>

    <div
      v-if="expanded"
      class="checkbox-list-wrapper"
    >
      <KCheckbox
        v-for="option in filteredCategories"
        :key="option.value"
        data-test="option-checkbox"
        :label="option.text"
        :style="treeItemStyle(option)"
        :checked="isSelected(option.value)"
        @change="onChange(option.value)"
      />
      <p
        v-if="!filteredCategories.length"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ $tr('noCategoryFoundText') }}
      </p>
    </div>
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { getSortedCategories } from 'shared/utils/helpers';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'CategoryOptions',
    components: { DropdownWrapper },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      /**
       * This prop receives an object with the following structure:
       * {
       *  [categoryId]: [nodeId1, nodeId2, ...]
       * }
       * Where nodeId is the id of the node that has the category selected
       */
      value: {
        type: Object,
        required: true,
      },
      /**
       * An array of nodeIds that we are editing. If none, we will asume that we
       * are editing just one node
       */
      nodeIds: {
        type: Array,
        default: () => [],
      },
      expanded: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        categoryText: null,
      };
    },
    computed: {
      categoriesList() {
        const categories = getSortedCategories();
        return Object.entries(categories).map(([id, category]) => ({
          value: id,
          text: this.translateMetadataString(camelCase(category)),
          level: this.findDepth(id),
        }));
      },
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      autocompleteValues() {
        const selectedValues = Object.entries(this.selected)
          .filter(entry => entry[1].length === this.nodeIds.length)
          .map(([key]) => key);
        return selectedValues;
      },
      nested() {
        return !this.categoryText;
      },
      filteredCategories() {
        const searchQuery = this.categoryText?.trim().toLowerCase();
        if (!searchQuery) {
          return this.categoriesList;
        }
        return this.categoriesList.filter(option =>
          option.text.toLowerCase().includes(searchQuery),
        );
      },
    },
    methods: {
      treeItemStyle(item) {
        const rule = this.$isRTL ? 'paddingRight' : 'paddingLeft';
        return this.nested ? { [rule]: `${item.level * 24}px` } : {};
      },
      add(value) {
        this.selected = {
          ...this.selected,
          [value]: this.nodeIds,
        };
      },
      remove(value) {
        const newSelected = { ...this.selected };
        Object.keys(this.selected)
          .filter(selectedValue => selectedValue.startsWith(value))
          .forEach(selectedValue => {
            delete newSelected[selectedValue];
          });
        this.selected = newSelected;
      },
      removeAll() {
        this.selected = {};
      },
      tooltipText(optionId) {
        const option = this.categoriesList.find(option => option.value === optionId);
        if (!option) {
          return '';
        }
        let currentOption = optionId;
        let text = option.text || '';
        const level = option.level;
        for (let i = level - 1; i >= 0; i--) {
          const parentOption = this.categoriesList.find(
            option => currentOption.startsWith(option.value) && option.level === i,
          );
          if (parentOption) {
            text = `${parentOption.text} - ${text}`;
            currentOption = parentOption.value;
          }
        }
        return text;
      },
      findDepth(val) {
        return val.split('.').length - 1;
      },
      isSelected(value) {
        // If the value is truthy (true or an array of nodeIds) then
        // it is selected just if it is true (not an array)
        if (this.selected[value] && this.selected[value].length === this.nodeIds.length) {
          return true;
        }

        return this.isCheckboxSelectedByChildren(value);
      },
      /**
       * Returns true if the given option should be selected thanks to its children.
       * An option will be selected thanks to its children if:
       * * One of the children is selected
       * * It has several indeterminate children, but by joining all the contentNodes of the
       *   child options, together they constitute the same array of selected contentNodes.
       */
      isCheckboxSelectedByChildren(optionId) {
        const childrenOptions = Object.keys(this.selected)
          .filter(selectedValue => selectedValue.startsWith(optionId))
          .map(selectedValue => this.selected[selectedValue]);

        if (childrenOptions.length === 0) {
          return false; // No childen options
        } else if (childrenOptions.length === 1) {
          // just one child option, the value is deterrmined by if it is selected
          return childrenOptions[0].length === this.nodeIds.length;
        }

        // Here multiple children are selected or indeterminate
        if (childrenOptions.some(value => value.length === this.nodeIds.length)) {
          // if some child value is selected for all nodes, then the parent option is selected
          return true;
        }

        // Here all children options are mixed, we need to check if together
        // the parent option is common for all nodes
        const nodeIds = new Set();
        childrenOptions.forEach(valueNodeIds => {
          valueNodeIds.forEach(nodeId => nodeIds.add(nodeId));
        });
        return nodeIds.size === this.nodeIds.length;
      },
      onChange(optionId) {
        if (this.isSelected(optionId)) {
          this.remove(optionId);
        } else {
          this.add(optionId);
        }
      },
    },
    $trs: {
      noCategoryFoundText: 'Category not found',
    },
  };

</script>


<style lang="scss" scoped>

  .parentOption:not(:first-child) {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
  }

  .checkbox-list-wrapper {
    height: 250px;
    overflow-y: auto;
  }

</style>
