<template>
  <KModal
    :title="$tr('editCompletion')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-completion-modal"
    @submit="handleSave"
    @cancel="close"
  >
    <KCheckbox
      :checked="learnerManaged"
      data-test="learner-managed-checkbox"
      :label="$tr('learnersCanMarkComplete')"
      @change="value => learnerManaged = value"
    />
    <component
      :is="contentComponent"
      :nodeId="nodeId"
    />
  </KModal>
</template>

<script>
  import { mapGetters } from 'vuex';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import DefaultCompletion from './DefaultCompletion';
  import DocumentCompletion from './DocumentCompletion';
  import ExerciseCompletion from './ExerciseCompletion';
  import AudioVideoCompletion from './AudioVideoCompletion';

  const mapComponents = {
    [ContentKindsNames.AUDIO]: AudioVideoCompletion,
    [ContentKindsNames.VIDEO]: AudioVideoCompletion,
    [ContentKindsNames.EXERCISE]: ExerciseCompletion,
    [ContentKindsNames.DOCUMENT]: DocumentCompletion,
  };
  export default {
    name: 'EditCompletionModal',
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    components: {
      DefaultCompletion,
      DocumentCompletion,
      ExerciseCompletion,
      AudioVideoCompletion,
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      contentNode() {
        return this.getContentNode(this.nodeId);
      },
      contentComponent() {
        return mapComponents[this.contentNode.kind] || DefaultCompletion;
      },
    },
    data() {
      return {
        learnerManaged: false,
      }
    },
    methods: {
      handleSave() {
        this.$emit('save');
        this.close();
      },
      close() {
        this.$emit('close');
      },
    },
    $trs: {
      editCompletion: 'Edit Completion',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      learnersCanMarkComplete: 'Allow learners to mark this resource as complete',
    },
  }

</script>

<style scoped>
</style>