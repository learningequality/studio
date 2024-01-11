<template>

  <KModal
    :title="$tr('editCategories')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-categories-modal"
    @submit="handleSave"
    @cancel="close"
  >
    <p data-test="resources-selected-message">
      {{ $tr('resourcesSelected', { count: nodeIds.length }) }}
    </p>
    <VAutocomplete
      :value="selectedCategoriesValues"
      :items="categoriesWithMixedOptions"
      :searchInput.sync="searchQuery"
      :label="$tr('selectCategory')"
      box
      clearable
      chips
      deletableChips
      multiple
      item-value="value"
      item-text="label"
      data-test="category-autocomplete"
      :menu-props="{ height: 0, maxHeight: 0 } /* hide menu */"
      @input="inputUpdate"
    >
      <template #selection="data">
        <VTooltip top lazy>
          <template #activator="{ on, attrs }">
            <VChip
              v-bind="attrs"
              :close="!data.item.undeletable"
              data-test="category-chip"
              v-on="on"
              @input="onSelectCategory(data.item, false)"
            >
              {{ data.item.label }}
            </VChip>
          </template>
          <div>
            <div>{{ tooltipText(data.item.value) }}</div>
          </div>
        </VTooltip>
      </template>
    </VAutocomplete>
    <template v-if="isTopicSelected">
      <KCheckbox
        v-model="updateDescendants"
        data-test="update-descendants-checkbox"
        :label="$tr('updateDescendantsCheckbox')"
      />
      <hr
        :style="dividerStyle"
      >
    </template>
    <div class="categories-options">
      <KCheckbox
        v-for="category in categoriesOptions"
        :key="category.value"
        data-test="category-checkbox"
        :label="category.label"
        :style="treeItemStyle(category)"
        :checked="isCheckboxSelected(category)"
        :indeterminate="isCheckboxIndeterminate(category)"
        @change="value => onSelectCategory(category, value)"
      />
      <p
        v-if="!categoriesOptions.length"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ $tr('emptyCategoriesSearch') }}
      </p>
    </div>
  </KModal>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { mapGetters, mapActions } from 'vuex';
  import { CategoriesLookup } from 'shared/constants';
  import { metadataTranslationMixin } from 'shared/mixins';
  import { getSortedCategories } from 'shared/utils/helpers';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  const MIXED = 'mixed';

  export default {
    name: 'EditCategoriesModal',
    mixins: [metadataTranslationMixin],
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        updateDescendants: false,
        categories: [],
        searchQuery: '',
        selectedCategories: {},
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodes']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      isTopicSelected() {
        return this.nodes.some(node => node.kind === ContentKindsNames.TOPIC);
      },
      categoriesOptions() {
        const searchQuery = this.searchQuery?.trim().toLowerCase();
        if (!this.searchQuery) {
          return this.categories;
        }
        return this.categories.filter(category =>
          category.label.toLowerCase().includes(searchQuery)
        );
      },
      flatList() {
        return this.searchQuery && this.searchQuery.trim().length > 0;
      },
      dividerStyle() {
        return {
          border: 0,
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          margin: '1em 0',
        };
      },
      categoriesWithMixedOptions() {
        return [
          {
            value: MIXED,
            label: this.$tr('mixedLabel'),
            undeletable: true,
          },
          ...this.categories,
        ];
      },
      selectedCategoriesValues() {
        const selectedCategories = Object.entries(this.selectedCategories)
          .filter(entry => entry[1] === true) // no mixed values
          .map(([key]) => key);
        if (Object.values(this.selectedCategories).some(value => value !== true)) {
          selectedCategories.push(MIXED);
        }
        return selectedCategories;
      },
    },
    created() {
      const categories = getSortedCategories();
      this.categories = Object.entries(categories).map(([id, category]) => ({
        value: id,
        label: this.translateMetadataString(camelCase(category)),
        level: id.split('.').length,
      }));

      const categoriesNodes = {};

      this.nodes.forEach(node => {
        Object.entries(node.categories || {})
          .filter(entry => entry[1] === true)
          .forEach(([category]) => {
            categoriesNodes[category] = categoriesNodes[category] || [];
            categoriesNodes[category].push(node.id);
          });
      });

      Object.entries(categoriesNodes).forEach(([key, nodeIds]) => {
        if (nodeIds.length === this.nodeIds.length) {
          this.selectedCategories[key] = true;
        } else {
          this.selectedCategories[key] = nodeIds;
        }
      });
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      close() {
        this.$emit('close');
      },
      isCheckboxSelected(category) {
        if (this.selectedCategories[category.value]) {
          return this.selectedCategories[category.value] === true;
        }

        const categoriesValues = Object.keys(this.selectedCategories)
          .filter(selectedCategory => selectedCategory.startsWith(category.value))
          .map(selectedCategory => this.selectedCategories[selectedCategory]);
        if (categoriesValues.length === 0) {
          return false;
        } else if (categoriesValues.length === 1) {
          return categoriesValues[0] === true;
        }
        // Child categories are selected
        if (categoriesValues.some(value => value === true)) {
          // if some child category is selected for all nodes, then it is selected
          return true;
        }

        // Here all child categories are mixed, we need to check if together
        // they are all selected for the parent category
        const nodeIds = new Set();
        categoriesValues.forEach(categoryNodeIds => {
          categoryNodeIds.forEach(nodeId => nodeIds.add(nodeId));
        });
        return nodeIds.size === this.nodeIds.length;
      },
      isCheckboxIndeterminate(category) {
        if (this.selectedCategories[category.value]) {
          return this.selectedCategories[category.value] !== true;
        }

        return (
          Object.keys(this.selectedCategories).some(selectedCategory =>
            selectedCategory.startsWith(category.value)
          ) && !this.isCheckboxSelected(category)
        );
      },
      async handleSave() {
        await Promise.all(
          this.nodes.map(node => {
            const categories = {};
            Object.entries(this.selectedCategories).forEach(([key, value]) => {
              if (value === true || value.includes(node.id)) {
                categories[key] = true;
              }
            });
            if (this.updateDescendants && node.kind === ContentKindsNames.TOPIC) {
              // will update with the new function to update all descendants
              return this.updateContentNode({
                id: node.id,
                categories,
              });
            }
            return this.updateContentNode({
              id: node.id,
              categories,
            });
          })
        );
        this.$store.dispatch(
          'showSnackbarSimple',
          this.$tr('editedCategories', { count: this.nodes.length })
        );
        this.close();
      },
      onSelectCategory(category, value) {
        if (value) {
          this.selectedCategories = {
            ...this.selectedCategories,
            [category.value]: true,
          };
        } else {
          const newSelectedCategories = { ...this.selectedCategories };

          Object.keys(this.selectedCategories).forEach(key => {
            if (key.startsWith(category.value)) {
              delete newSelectedCategories[key];
            }
          });
          this.selectedCategories = newSelectedCategories;
        }
      },
      inputUpdate(selected) {
        const newSelectedCategories = {};
        selected.forEach(category => {
          newSelectedCategories[category] = true;
        });
        this.selectedCategories = newSelectedCategories;
      },
      treeItemStyle(item) {
        const rule = this.$isRTL ? 'paddingRight' : 'paddingLeft';
        return this.flatList ? {} : { [rule]: `${item.level * 24}px` };
      },
      tooltipText(category) {
        if (category === MIXED) {
          return this.$tr('mixedLabel');
        }
        const parentCategories = category.split('.');
        let prefixId = '';
        return parentCategories
          .map(category => {
            const categoryName = CategoriesLookup[`${prefixId}${category}`];
            prefixId += `${category}.`;
            return this.translateMetadataString(camelCase(categoryName)) || '';
          })
          .join(' - ');
      },
    },
    $trs: {
      editCategories: 'Edit Categories',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      editedCategories:
        'Edited categories for {count, number, integer} {count, plural, one {resource} other {resources}}',
      selectCategory: 'Select / Type Category',
      resourcesSelected:
        '{count, number, integer} {count, plural, one {resource} other {resources}} selected',
      updateDescendantsCheckbox:
        'Apply to all resources and folders nested within the selected folders',
      mixedLabel: 'Mixed',
      emptyCategoriesSearch: 'No categories matches the search',
    },
  };

</script>

<style scoped>
  .categories-options {
    height: 350px;
    overflow-y: auto;
  }
</style>