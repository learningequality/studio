<template>

  <EditBooleanMapModal
    field="learning_activities"
    isDescendantsUpdatable
    :title="$tr('editLearningActivitiesTitle')"
    :nodeIds="nodeIds"
    :options="learningActivitiesOptions"
    :validators="learningActivityValidators"
    :confirmationMessage="$tr('editedLearningActivities', { count: nodeIds.length })"
    @close="close"
  />

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import EditBooleanMapModal from './EditBooleanMapModal';
  import { LearningActivities } from 'shared/constants';
  import { metadataTranslationMixin } from 'shared/mixins';
  import { getLearningActivityValidators } from 'shared/utils/validation';

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
      learningActivitiesOptions() {
        return Object.entries(LearningActivities).map(([key, value]) => ({
          label: this.translateMetadataString(camelCase(key)),
          value,
        }));
      },
      learningActivityValidators() {
        return getLearningActivityValidators();
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
