<template>

  <EditBooleanMapModal
    field="learning_activities"
    isDescendantsUpdatable
    :title="$tr('editLearningActivitiesTitle')"
    :nodeIds="nodeIds"
    :validators="learningActivityValidators"
    :confirmationMessage="changesSaved"
    :resourcesSelectedText="resourcesSelectedText"
    v-on="$listeners"
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
      resourcesSelectedText: {
        type: String,
        default: '',
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
      editLearningActivitiesTitle: 'Edit learning activities',
    },
  };

</script>


<style scoped></style>
