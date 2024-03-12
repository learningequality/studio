<template>

  <EditBooleanMapModal
    field="categories"
    isDescendantsUpdatable
    :title="$tr('editCategories')"
    :nodeIds="nodeIds"
    :confirmationMessage="$tr('editedCategories', { count: nodeIds.length })"
    @close="() => $emit('close')"
  >
    <template #input="{ value, inputHandler }">
      <CategoryOptions
        expanded
        hideLabel
        :value="value"
        :nodeIds="nodeIds"
        @input="inputHandler"
      />
    </template>
  </EditBooleanMapModal>

</template>


<script>

  import EditBooleanMapModal from './EditBooleanMapModal.vue';
  import CategoryOptions from 'shared/views/contentNodeFields/CategoryOptions';

  export default {
    name: 'EditCategoriesModal',
    components: {
      CategoryOptions,
      EditBooleanMapModal,
    },
    props: {
      nodeIds: {
        type: Array,
        required: true,
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