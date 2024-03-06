<template>

  <EditBooleanMapModal
    field="categories"
    isDescendantsUpdatable
    :title="$tr('editCategories')"
    :nodeIds="nodeIds"
    :confirmationMessage="$tr('editedCategories', { count: nodeIds.length })"
    :inputComponent="CategoryOptionsComponent"
    @close="() => $emit('close')"
  />

</template>


<script>

  import EditBooleanMapModal from './EditBooleanMapModal.vue';
  import CategoryOptions from 'shared/views/contentNodeFields/CategoryOptions';

  export default {
    name: 'EditCategoriesModal',
    components: {
      EditBooleanMapModal,
    },
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    computed: {
      CategoryOptionsComponent() {
        return CategoryOptions;
      },
    },
    $trs: {
      editCategories: 'Edit Categories',
      editedCategories:
        'Edited categories for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>

<style scoped>
</style>