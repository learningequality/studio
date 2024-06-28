<template>

  <EditBooleanMapModal
    field="grade_levels"
    isDescendantsUpdatable
    :title="$tr('editLevelsTitle')"
    :nodeIds="nodeIds"
    :confirmationMessage="$tr('editedLevels', { count: nodeIds.length })"
    @close="() => $emit('close')"
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
