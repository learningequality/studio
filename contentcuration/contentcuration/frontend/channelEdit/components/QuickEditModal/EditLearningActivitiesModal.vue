<template>

  <EditBooleanMapModal
    field="learning_activities"
    isDescendantsUpdatable
    :title="$tr('editLearningActivitiesTitle')"
    :nodeIds="nodeIds"
    :validators="learningActivityValidators"
    :confirmationMessage="changesSaved"
    @close="() => $emit('close')"
  >
    <template #input="{ value, inputHandler }">
      <LearningActivityOptions
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
  import { getLearningActivityValidators } from 'shared/utils/validation';
  import LearningActivityOptions from 'shared/views/contentNodeFields/LearningActivityOptions';
  import commonStrings from 'shared/translator';

  export default {
    name: 'EditLearningActivitiesModal',
    components: {
      EditBooleanMapModal,
      LearningActivityOptions,
    },
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
      changesSaved() {
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        return commonStrings.$tr('changesSaved');
      },
    },
    $trs: {
      editLearningActivitiesTitle: 'Edit Learning Activities',
    },
  };

</script>


<style scoped>
</style>
