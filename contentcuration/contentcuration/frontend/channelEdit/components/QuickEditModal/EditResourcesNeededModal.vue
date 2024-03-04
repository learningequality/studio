<template>

  <EditBooleanMapModal
    field="learner_needs"
    isDescendantsUpdatable
    :title="$tr('editResourcesNeededTitle')"
    :nodeIds="nodeIds"
    :confirmationMessage="$tr('editedResourcesNeeded', { count: nodeIds.length })"
    :inputComponent="ResourcesNeededOptionsComponent"
    @close="close"
  />

</template>


<script>

  import EditBooleanMapModal from './EditBooleanMapModal';
  import ResourcesNeededOptions from 'shared/views/contentNodeFields/ResourcesNeededOptions';

  export default {
    name: 'EditResourcesNeededModal',
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
      ResourcesNeededOptionsComponent() {
        return ResourcesNeededOptions;
      },
    },
    methods: {
      close() {
        this.$emit('close');
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
