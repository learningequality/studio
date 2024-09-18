<template>

  <EditBooleanMapModal
    field="grade_levels"
    isDescendantsUpdatable
    :title="$tr('editLevelsTitle')"
    :nodeIds="nodeIds"
    :confirmationMessage="changesSaved"
    :resourcesSelectedText="resourcesSelectedText"
    v-on="$listeners"
  >
    <template #input="{ value, inputHandler }">
      <LevelsOptions
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

  import EditBooleanMapModal from './EditBooleanMapModal';
  import LevelsOptions from 'shared/views/contentNodeFields/LevelsOptions';
  import commonStrings from 'shared/translator';

  export default {
    name: 'EditLevelsModal',
    components: {
      LevelsOptions,
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
      editLevelsTitle: 'Edit levels',
    },
  };

</script>


<style scoped>
</style>
