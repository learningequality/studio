<template>

  <EditBooleanMapModal
    field="learning_activities"
    isDescendantsUpdatable
    :title="$tr('editLearningActivitiesTitle')"
    :nodeIds="nodeIds"
    :validators="learningActivityValidators"
    :inputComponent="LearningActivityOptionsComponent"
    :confirmationMessage="$tr('editedLearningActivities', { count: nodeIds.length })"
    @close="close"
  />

</template>


<script>

  import EditBooleanMapModal from './EditBooleanMapModal';
  import { metadataTranslationMixin } from 'shared/mixins';
  import { getLearningActivityValidators } from 'shared/utils/validation';
  import LearningActivityOptions from 'shared/views/contentNodeFields/LearningActivityOptions';

  export default {
    name: 'EditLearningActivitiesModal',
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
      learningActivityValidators() {
        return getLearningActivityValidators();
      },
      LearningActivityOptionsComponent() {
        return LearningActivityOptions;
      },
    },
    methods: {
      close() {
        this.$emit('close');
      },
    },
    $trs: {
      editLearningActivitiesTitle: 'Edit Learning Activities',
      editedLearningActivities:
        'Edited learning activities for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>


<style scoped>
</style>
