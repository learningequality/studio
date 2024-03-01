<template>

  <EditBooleanMapModal
    field="grade_levels"
    isDescendantsUpdatable
    :title="$tr('editLevelsTitle')"
    :nodeIds="nodeIds"
    :inputComponent="LevelsOptionsComponent"
    :confirmationMessage="$tr('editedLevels', { count: nodeIds.length })"
    @close="close"
  />

</template>


<script>

  import EditBooleanMapModal from './EditBooleanMapModal';
  import { metadataTranslationMixin } from 'shared/mixins';
  import LevelsOptions from 'shared/views/contentNodeFields/LevelsOptions';

  export default {
    name: 'EditLevelsModal',
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
      LevelsOptionsComponent() {
        return LevelsOptions;
      },
    },
    methods: {
      close() {
        this.$emit('close');
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
