<template>

  <div id="app">
    <VAutocomplete
      :value="selected"
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
      @click:clear="item => remove(item.value)"
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
            :checked="dropdownSelected[item.value]"
            :label="item.text"
            :value="item.value"
            style="margin-top: 10px"
            :style="treeItemStyle(item)"
            :ripple="false"
            @change="checked => checked ? add(item.value) : remove(item.value)"
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
        const obj = {};
        for (let category of this.selected) {
          const paths = category.split('.');
          let cat = '';
          for (let path of paths) {
            cat += path;
            obj[cat] = true;
            cat += '.';
          }
        }
        return obj;
      },
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      nested() {
        return !this.categoryText;
      },
    },
    methods: {
      treeItemStyle(item) {
        return this.nested ? { paddingLeft: `${item.level * 24}px` } : {};
      },
      add(item) {
        this.selected = [...this.selected, item];
      },
      remove(item) {
        this.selected = this.selected.filter(i => !i.startsWith(item));
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
