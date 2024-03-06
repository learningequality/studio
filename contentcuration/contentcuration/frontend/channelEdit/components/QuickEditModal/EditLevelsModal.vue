<template>

  <EditBooleanMapModal
    field="grade_levels"
    isDescendantsUpdatable
    :title="$tr('editLevelsTitle')"
    :nodeIds="nodeIds"
    :inputComponent="LevelsOptionsComponent"
    :confirmationMessage="$tr('editedLevels', { count: nodeIds.length })"
    @close="() => $emit('close')"
  />

</template>


<script>

  import EditBooleanMapModal from './EditBooleanMapModal';
  import LevelsOptions from 'shared/views/contentNodeFields/LevelsOptions';

  export default {
    name: 'EditLevelsModal',
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
      LevelsOptionsComponent() {
        return LevelsOptions;
      },
    },
    $trs: {
      editLevelsTitle: 'What Levels',
      editedLevels:
        'Edited levels for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>


<style scoped>
</style>
