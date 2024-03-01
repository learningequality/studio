<template>

  <div>
    <DropdownWrapper>
      <template #default="{ attach, menuProps }">
        <VAutocomplete
          :value="autocompleteValues"
          :items="autocompleteOptions"
          :searchInput.sync="categoryText"
          :label="translateMetadataString('category')"
          box
          clearable
          chips
          deletableChips
          multiple
          item-value="value"
          item-text="text"
          :menu-props="{ ...menuProps, zIndex: 4 }"
          :attach="attach"
          @click:clear="$nextTick(() => removeAll())"
        >
          <template #selection="data">
            <VTooltip bottom lazy>
              <template #activator="{ on, attrs }">
                <VChip v-bind="attrs" close v-on="on" @input="remove(data.item.value)">
                  {{ data.item.text }}
                </VChip>
              </template>
              <div>
                <div>{{ tooltipHelper(data.item.value) }}</div>
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

    <slot name="prependOptions" />
    
    <div class="checkbox-list-wrapper" v-if="expanded">
      <KCheckbox
        v-for="option in filteredCategories"
        :key="option.value"
        data-test="option-checkbox"
        :label="option.text"
        :style="treeItemStyle(option)"
        :checked="isSelected(option.value)"
        :indeterminate="isCheckboxIndeterminate(option.value)"
        @change="onChange(option.value)"
      />
      <p
        v-if="!filteredCategories.length"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ emptyText || $tr('emptyOptionsSearch') }}
      </p>
    </div>
  </div>
</template>

<script>

  import camelCase from 'lodash/camelCase';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';
  import { Categories, CategoriesLookup } from 'shared/constants';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  const availablePaths = {};
  const categoriesObj = {};
  const dropdown = [];

  Object.assign(availablePaths, CategoriesLookup);

  /*
   * This is used to create the categories object from which the dropdown list is generated
   * and is the same as this to make sure the order in Kolibri and Studio are the same:
   * https://github.com/learningequality/kolibri/blob/develop/kolibri/plugins/learn/assets/
   *   src/views/CategorySearchModal/CategorySearchOptions.vue#L73
   */
  for (const subjectKey of Object.entries(Categories)
    .sort((a, b) => a[1].length - b[1].length)
    .map(a => a[0])) {
    const ids = Categories[subjectKey].split('.');

    let path = '';
    let nested = categoriesObj;
    for (const fragment of ids) {
      path += fragment;
      if (availablePaths[path]) {
        const nestedKey = CategoriesLookup[path];
        if (!nested[nestedKey]) {
          nested[nestedKey] = {
            value: path,
            nested: {},
          };
        }
        nested = nested[nestedKey].nested;
        path += '.';
      } else {
        break;
      }
    }
  }

  const flattenCategories = obj => {
    Object.keys(obj).forEach(key => {
      if (key !== 'value' && key !== 'nested') {
        dropdown.push({
          text: key,
          value: obj[key]['value'],
        });
      }
      if (typeof obj[key] === 'object') {
        flattenCategories(obj[key]);
      }
    });
    return dropdown;
  };

  flattenCategories(categoriesObj);

  const MIXED = 'mixed';

  export default {
    name: 'CategoryOptions',
    components: { DropdownWrapper },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      value: {
        type: Array | Object,
        default: () => [],
      },
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
        return dropdown.map(category => {
          return {
            ...category,
            text: this.translateMetadataString(camelCase(category.text)),
            level: this.findDepth(Categories[category.text]),
          };
        });
      },
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      autocompleteOptions() {
        const options =  [...this.categoriesList];
        if (!Array.isArray(this.selected)){
          options.unshift({
            value: MIXED,
            label: this.$tr('mixedLabel'),
            undeletable: true,
          });
        }
        return options;
      },
      autocompleteValues() {
        if (Array.isArray(this.selected)) {
          return this.selected;
        }
        const selectedValues = Object.entries(this.selected)
          .filter(entry => entry[1] === true) // no mixed values
          .map(([key]) => key);
        if (Object.values(this.selected).some(value => value !== true)) {
          selectedValues.push(MIXED);
        }
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
        return this.categoriesList.filter(option => option.text.toLowerCase().includes(searchQuery));
      },
    },
    methods: {
      treeItemStyle(item) {
        const rule = this.$isRTL ? 'paddingRight' : 'paddingLeft';
        return this.nested ? { [rule]: `${item.level * 24}px` } : {};
      },
      add(value) {
        this.selected = [...this.selected, value];
      },
      remove(value) {
        this.selected = this.selected.filter(i => !i.startsWith(value));
      },
      removeAll() {
        this.selected = [];
      },
      tooltipHelper(id) {
        return this.displayFamilyTree(dropdown, id)
          .map(node => this.translateMetadataString(camelCase(node.text)))
          .join(' - ');
      },
      findDepth(val) {
        return val.split('.').length - 1;
      },
      displayFamilyTree(nodes, id) {
        return nodes.filter(node => this.findFamilyTreeIds(id).includes(node.value));
      },
      /**
       * @param {String} id The id of the selected category
       * @returns {Array} An array of all ids of the family beginning with the selected category
       */
      findFamilyTreeIds(id) {
        const family = [];
        let familyMember = id;
        while (familyMember) {
          family.push(familyMember);
          familyMember = familyMember.includes('.')
            ? familyMember.substring(0, familyMember.lastIndexOf('.'))
            : null;
        }
        return family;
      },
      isSelected(value) {
        if (Array.isArray(this.selected)) {
          return this.selected.some(v => v.startsWith(value));
        }
        // If not, this.selected is a boolean map

        // If the value is truthy (true or an array of nodeIds) then
        // it is selected just if it is true (not an array)
        if (this.selected[value]) {
          return this.selected[value] === true;
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
        if (!this.nodeIds || !this.nodeIds.length) {
          return false;
        }
        const childrenOptions = Object.keys(this.selected)
          .filter(selectedValue => selectedValue.startsWith(optionId))
          .map(selectedValue => this.selected[selectedValue]);

        if (childrenOptions.length === 0) {
          return false; // No childen options
        } else if (childrenOptions.length === 1) {
          // just one child option, the value is deterrmined by if it is selected
          return childrenOptions[0] === true;
        }

        // Here multiple children are selected or indeterminate
        if (childrenOptions.some(value => value === true)) {
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
      isCheckboxIndeterminate(optionId) {
        if (Array.isArray(this.selected)) {
          return false;
        }
        if (this.selected[optionId]) {
          return this.selected[optionId] !== true;
        }
        return (
          Object.keys(this.selected).some(selectedValue =>
            selectedValue.startsWith(optionId)
          ) && !this.isSelected(optionId)
        );
      },
      onChange(optionId) {
        if (Array.isArray(this.selected)) {
          if (this.isSelected(optionId)) {
            this.selected = this.selected.filter(v => !v.startsWith(optionId));
          } else {
            this.selected = [...this.selected, optionId];
          }
          return;
        }
        if (this.isSelected(optionId)) {
          const newSelected = { ...this.selected };
          Object.keys(this.selected)
            .filter(selectedValue => selectedValue.startsWith(optionId))
            .forEach(selectedValue => {
              delete newSelected[selectedValue];
            });
          this.selected = newSelected;
        } else {
          this.selected = { ...this.selected, [optionId]: true };
        }
      },
    },
    $trs: {
      noCategoryFoundText: 'Category not found',
    },
  };

</script>
<style lang="less" scoped>

  .parentOption:not(:first-child) {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
  }

  .checkbox-list-wrapper {
    height: 250px;
    overflow-y: auto;
  }

</style>
