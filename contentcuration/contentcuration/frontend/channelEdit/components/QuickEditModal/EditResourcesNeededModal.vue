<template>

  <EditBooleanMapModal
    field="learner_needs"
    isDescendantsUpdatable
    :title="$tr('editResourcesNeededTitle')"
    :nodeIds="nodeIds"
    :options="resourcesOptions"
    :confirmationMessage="$tr('editedResourcesNeeded', { count: nodeIds.length })"
    @close="close"
  />

</template>


<script>

  import EditBooleanMapModal from './EditBooleanMapModal';
  import { ResourcesNeededTypes, ResourcesNeededOptions } from 'shared/constants';
  import { metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'EditResourcesNeededModal',
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
    computed: {
      resourcesOptions() {
        return ResourcesNeededOptions.map(key => ({
          label: this.translateMetadataString(key),
          value: ResourcesNeededTypes[key],
        }));
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
