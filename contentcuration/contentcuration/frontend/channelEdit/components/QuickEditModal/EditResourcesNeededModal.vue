<template>

  <EditBooleanMapModal
    field="learner_needs"
    isDescendantsUpdatable
    :title="$tr('editResourcesNeededTitle')"
    :nodeIds="nodeIds"
    :confirmationMessage="$tr('editedResourcesNeeded', { count: nodeIds.length })"
    @close="() => $emit('close')"
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
    },
    $trs: {
      editResourcesNeededTitle: 'What will you need?',
      editedResourcesNeeded:
        "Edited 'what will you need' for {count, number, integer} {count, plural, one {resource} other {resources}}",
    },
  };

</script>


<style scoped>
</style>
