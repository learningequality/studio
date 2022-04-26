<template>

  <div id="app">
    <VAutocomplete
      v-model="selected"
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
    >
      <template v-slot:selection="data">
        <VTooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <VChip v-bind="attrs" close v-on="on" @input="remove(data.item.value)">
              {{ data.item.text }}
            </VChip>
          </template>
          <div>
            <div>{{ tooltipHelper(data.item.value) }}</div>
          </div>
        </VTooltip>
      </template>

      <template v-slot:no-data>
        <VListTile v-if="categoryText && categoryText.trim()">
          <VListTileContent>
            <VListTileTitle>
              {{ $tr('noCategoryFoundText', { text: categoryText.trim() }) }}
            </VListTileTitle>
          </VListTileContent>
        </VListTile>
      </template>

      <template v-slot:item="{ item }">
        <div style="width: 100%; height: 100%" aria-hidden="true">
          <VDivider v-if="!item.value.includes('.')" />
          <KCheckbox
            v-model="selected"
            :checked="dropdownSelected.includes(item.value)"
            :label="item.text"
            :value="item.value"
            style="margin-top: 10px"
            :style="treeItemStyle(item)"
            :ripple="false"
          />
        </div>
      </template>
    </VAutocomplete>
  </div>

</template>

<script>

  import { camelCase } from 'lodash';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';
  import { Categories, CategoriesLookup } from 'shared/constants';

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
  for (let subjectKey of Object.entries(Categories)
    .sort((a, b) => a[1].length - b[1].length)
    .map(a => a[0])) {
    const ids = Categories[subjectKey].split('.');

    let path = '';
    let nested = categoriesObj;
    for (let fragment of ids) {
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

  export default {
    name: 'CategoryOptions',
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      value: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        categoryText: null,
        chipsSelected: [],
        nested: true,
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
      dropdownSelected() {
        return [
          ...new Set(
            this.chipsSelected.reduce((a, chip) => a.concat(this.findFamilyTreeIds(chip)), [])
          ),
        ];
      },
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          let items = [...value];
          let currentItem = items[items.length - 1] || '';

          this.handleCheckboxItem(currentItem, items);
          this.$emit('input', this.chipsSelected);
        },
      },
      dropdownSelectedObj() {
        return this.dropdownSelected.map(item => {
          return {
            text: this.translateMetadataString(camelCase(CategoriesLookup[item])),
            value: item,
            level: this.findDepth(item),
          };
        });
      },
    },
    watch: {
      categoryText(val) {
        return !val ? (this.nested = true) : (this.nested = false);
      },
    },
    methods: {
      treeItemStyle(item) {
        return this.nested ? { paddingLeft: `${item.level * 24}px` } : {};
      },
      remove(item) {
        this.chipsSelected.splice(this.chipsSelected.indexOf(item), 1);
        this.$emit('input', this.chipsSelected);
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
      findFamilyTreeIds(value) {
        const family = [];
        let familyMember = value;
        while (familyMember) {
          family.push(familyMember);
          familyMember = familyMember.includes('.')
            ? familyMember.substring(0, familyMember.lastIndexOf('.'))
            : null;
        }
        return family;
      },
      handleCheckboxItem(item, items) {
        const parents = this.findFamilyTreeIds(item).filter(familyMember => familyMember !== item);
        const rootParent = parents[0];
        const directParent = item.substring(0, item.lastIndexOf('.')) || null;
        const potentialSiblings = this.dropdownSelectedObj.filter(
          checkedItem => checkedItem.level === this.findDepth(item) && checkedItem.value !== item
        );
        const numberOfSiblings = potentialSiblings.filter(sibling =>
          sibling.value.includes(directParent)
        ).length;

        // If removing a checked item that is listed as a chip in the autocomplete bar
        if (this.chipsSelected.length > items.length) {
          this.chipsSelected = items;
        } else {
          // Behaviors for items not listed as chips in the autocomplete bar
          if (this.dropdownSelected.includes(item)) {
            if (rootParent) {
              // If checked item has a sibling
              if (numberOfSiblings > 0) {
                this.chipsSelected = this.chipsSelected.filter(
                  chip => !chip.includes(item) && chip !== rootParent
                );
              } else {
                this.chipsSelected = [
                  ...this.chipsSelected.filter(chip => !chip.includes(item)),
                  rootParent,
                ];
              }
            } else {
              this.chipsSelected = [...this.chipsSelected.filter(chip => !chip.includes(item))];
            }
          } else {
            // If selecting a child item when parent has already been checked
            if (items.filter(val => parents.indexOf(val) !== -1)) {
              this.chipsSelected = items.filter(val => parents.indexOf(val) === -1);
            }
          }
        }
      },
    },
    $trs: {
      noCategoryFoundText: 'Category not found',
    },
  };

</script>
<style lang="less" scoped>

  /deep/ .v-list__tile {
    flex-wrap: wrap;
  }

</style>
