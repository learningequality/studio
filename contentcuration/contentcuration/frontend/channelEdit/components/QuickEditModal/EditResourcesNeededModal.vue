<template>

  <EditBooleanMapModal
    field="learner_needs"
    isDescendantsUpdatable
    :title="$tr('editResourcesNeededTitle')"
    :nodeIds="nodeIds"
    :confirmationMessage="changesSaved"
    :resourcesSelectedText="resourcesSelectedText"
    v-on="$listeners"
  >
    <template #input="{ value, inputHandler }">
      <ResourcesNeededOptions
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
  import ResourcesNeededOptions from 'shared/views/contentNodeFields/ResourcesNeededOptions';
  import commonStrings from 'shared/translator';

  export default {
    name: 'EditResourcesNeededModal',
    components: {
      EditBooleanMapModal,
      ResourcesNeededOptions,
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
      editResourcesNeededTitle: 'Edit requirements',
    },
  };

</script>


<style scoped>
</style>
