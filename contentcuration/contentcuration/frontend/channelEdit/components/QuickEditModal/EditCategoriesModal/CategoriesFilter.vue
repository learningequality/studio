<template>
  <div>
    <div class="categories-options">
      <KCheckbox
        v-for="category in categoriesOptions"
        :key="category.value"
        :value="category.value"
        :label="category.label"
        :style="treeItemStyle(category)"
        :ripple="false"
        :checked="isSelected(category)"
        @change="value => onSelectCategory(category, value)"
      />
    </div>
  </div>
</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { getSortedCategories } from 'shared/utils/helpers';
  import { metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'CategoriesFilter',
    components: {
    },
    mixins: [metadataTranslationMixin],
    data() {
      return {
        categories: [],
        searchQuery: '',
        selectedCategories: {},
      };
    },
    computed: {
      categoriesOptions() {
        const searchQuery = this.searchQuery.trim().toLowerCase();
        if (!this.searchQuery) {
          return this.categories;
        }
        return this.categories.filter(category => category.label.toLowerCase().includes(searchQuery));
      },
      flatList() {
        return this.searchQuery.trim().length > 0;
      },
      isSelected() {
        return (category) => Object.keys(this.selectedCategories).some(key => key.startsWith(category.value));
      },
    },
    created() {
      const categories = getSortedCategories();
      this.categories = Object.entries(categories).map(([id, category]) => ({
        value: id,
        label: this.translateMetadataString(camelCase(category)),
        level: id.split('.').length,
      }));
    },
    methods: {
      treeItemStyle(item) {
        const rule = this.$isRTL ? 'paddingRight' : 'paddingLeft';
        return this.flatList ? {} : { [rule]: `${item.level * 24}px` };
      },
      onSelectCategory(category, value) {
        if (value) {
          this.selectedCategories = {
            ...this.selectedCategories,
            [category.value]: true,
          };
        } else {
          const newSelectedCategories = { ...this.selectedCategories };
          Object.keys(this.selectedCategories).forEach((key) => {
            if (key.startsWith(category.value)) {
              delete newSelectedCategories[key];
            }
          });
          this.selectedCategories = newSelectedCategories;
        }
      },
    },
  };

</script>


<style lang="scss" scoped>
</style>
