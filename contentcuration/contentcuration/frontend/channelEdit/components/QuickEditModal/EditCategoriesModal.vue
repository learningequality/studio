<template>

  <EditBooleanMapModal
    field="categories"
    isDescendantsUpdatable
    :title="$tr('editCategories')"
    :nodeIds="nodeIds"
    :confirmationMessage="changesSaved"
    :resourcesSelectedText="resourcesSelectedText"
    v-on="$listeners"
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
  import commonStrings from 'shared/translator';

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
      resourcesSelectedText: {
        type: String,
        default: '',
      },
    },
    computed: {
      changesSaved() {
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        return commonStrings.$tr('changesSaved');
      },
    },
    $trs: {
      editCategories: 'Edit categories',
    },
  };

</script>

<style scoped>
</style>
