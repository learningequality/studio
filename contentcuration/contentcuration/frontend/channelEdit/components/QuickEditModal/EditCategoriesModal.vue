<template>

  <EditBooleanMapModal
    showHierarchy
    showAutocomplete
    field="categories"
    isDescendantsUpdatable
    :title="$tr('editCategories')"
    :nodeIds="nodeIds"
    :options="categoriesOptions"
    :autocompleteLabel="$tr('selectCategory')"
    :emptyText="$tr('emptyCategoriesSearch')"
    :confirmationMessage="$tr('editedCategories', { count: nodeIds.length })"
    :inputComponent="CategoryOptionsComponent"
    @close="close"
  />

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import EditBooleanMapModal from './EditBooleanMapModal.vue';
  import { metadataTranslationMixin } from 'shared/mixins';
  import { getSortedCategories } from 'shared/utils/helpers';
  import CategoryOptions from 'shared/views/contentNodeFields/CategoryOptions';

  export default {
    name: 'EditCategoriesModal',
    components: {
      EditBooleanMapModal,
    },
    mixins: [metadataTranslationMixin],
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        categoriesOptions: [],
      };
    },
    computed: {
      CategoryOptionsComponent() {
        return CategoryOptions;
      },
    },
    created() {
      const categories = getSortedCategories();
      this.categoriesOptions = Object.entries(categories).map(([id, category]) => ({
        value: id,
        label: this.translateMetadataString(camelCase(category)),
      }));
    },
    methods: {
      close() {
        this.$emit('close');
      },
    },
    $trs: {
      editCategories: 'Edit Categories',
      editedCategories:
        'Edited categories for {count, number, integer} {count, plural, one {resource} other {resources}}',
      selectCategory: 'Select / Type Category',
      emptyCategoriesSearch: 'No categories matches the search',
    },
  };

</script>

<style scoped>
</style>