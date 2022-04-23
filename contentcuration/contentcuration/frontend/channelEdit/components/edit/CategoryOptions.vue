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
        <!--
          `@click.stop` to prevent from propagating
          checkboxes updates to VAutocomplete automatically
          so that we can use our own handlers instead
        -->
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
            @click.stop
          />
        </div>
      </template>
    </VAutocomplete>
  </div>

</template>

<script>

  import { camelCase, intersection } from 'lodash';
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
        dropdownSelected: [],
        nested: true,
      };
    },
    computed: {
      categoriesList() {
        flattenCategories(categoriesObj);
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
          let items = [...value];
          let currentItem = items[items.length - 1];

          let parents = this.findFamilyTreeIds(currentItem).filter(
            familyMember => familyMember !== currentItem
          );
          let rootParent = parents[0];

          // If removing an item
          if (this.chipsSelected.length > items.length) {
            if (items.length === 0) {
              this.dropdownSelected = [];
            } else {
              this.dropdownSelected = intersection([
                ...this.dropdownSelected,
                ...items,
                ...parents,
              ]);
            }
            this.chipsSelected = items;
          } else {
            // If the currentItem is already included in the dropdown and we need to remove it
            // but it does not exist in the chips array because it is only visually represented
            if (this.dropdownSelected.includes(currentItem)) {
              this.dropdownSelected = this.dropdownSelected.filter(
                item => !item.includes(currentItem)
              );
              if (rootParent) {
                // If the root parent exists, then we need to change the chips
                this.chipsSelected = [
                  ...this.chipsSelected.filter(item => !item.includes(currentItem)),
                  rootParent,
                ];
              } else {
                this.chipsSelected = [
                  ...this.chipsSelected.filter(item => !item.includes(currentItem)),
                ];
              }
            } else {
              // If adding a brand new item, change dropdown
              this.dropdownSelected = intersection([
                ...this.dropdownSelected,
                ...items,
                ...parents,
              ]);

              // If selecting a child item when parent is checked
              if (items.filter(item => parents.indexOf(item) !== -1)) {
                this.chipsSelected = items.filter(item => parents.indexOf(item) === -1);
              }
            }
          }
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
        this.updateDropdownSelected(item);
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
      /**
       * This function is used to update the dropdown list when an item is removed
       * from chipsSelected array.
       * @param {string} chip - The value of the chip that was removed
       */
      updateDropdownSelected(chip) {
        let directParent = chip.substring(0, chip.lastIndexOf('.'));
        let potentialSiblings = this.dropdownSelectedObj.filter(
          item => item.level === this.findDepth(chip) && item.value !== chip
        );
        let numberOfSiblings = potentialSiblings.filter(item => item.value.includes(directParent))
          .length;
        let numberOfSiblingsOfParent =
          this.dropdownSelectedObj.filter(item => item.level === this.findDepth(chip) - 1).length -
          1;

        if (
          (numberOfSiblingsOfParent > 0 && numberOfSiblings > 0) ||
          (numberOfSiblingsOfParent === 0 && numberOfSiblings > 0)
        ) {
          // Remove only chip
          this.dropdownSelected = this.dropdownSelected.filter(item => !item.includes(chip));
        } else if (numberOfSiblingsOfParent > 0 && numberOfSiblings === 0) {
          // Remove only chip and direct parent
          this.dropdownSelected = this.dropdownSelected.filter(
            item => !item.includes(directParent)
          );
        } else if (numberOfSiblingsOfParent === 0 && numberOfSiblings === 0) {
          // Remove entire family tree
          this.dropdownSelected = this.dropdownSelected.filter(
            item => this.findFamilyTreeIds(chip).indexOf(item) === -1
          );
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
