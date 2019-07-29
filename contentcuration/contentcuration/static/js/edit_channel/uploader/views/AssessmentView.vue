<template>
  <div>
    <VAlert
      :value="!isNodeAssessmentDraftValid(nodeId)"
      icon="error"
      type="error"
      outline
      data-test="alert"
    >
      <span class="red--text font-weight-bold">{{ invalidItemsErrorMessage }}</span>
    </VAlert>

    <AssessmentEditor
      v-if="assessmentDraft"
      ref="assessmentEditor"
      :assessmentDraft="assessmentDraft"
      :openDialog="openDialog"
      @update="onAssessmentDraftUpdate"
    />

    <!-- TODO @MisRob: As soon as we know how dialogs should behave within the context
    of the whole edit modal, move to a more appropriate place (EditModal.vue maybe?)
    and merge with existing Dialog component - ideally, only one dialog should be rendered
    within a page
    -->
    <DialogBox
      v-model="dialog.open"
      :title="dialog.title"
    >
      {{ dialog.message }}

      <template slot="controls">
        <VBtn
          flat
          @click="dialog.onCancel"
        >
          {{ dialog.cancelLabel || $tr('dialogCancelBtnLabel') }}
        </VBtn>

        <VBtn
          color="primary"
          flat
          @click="dialog.onSubmit"
        >
          {{ dialog.submitLabel || $tr('dialogSubmitBtnLabel') }}
        </VBtn>
      </template>
    </DialogBox>
  </div>
</template>

<script>

  import { mapState, mapGetters, mapMutations } from 'vuex';

  import AssessmentEditor from '../components/AssessmentEditor/AssessmentEditor.vue';
  import DialogBox from '../components/DialogBox/DialogBox.vue';

  export default {
    name: 'AssessmentView',
    $trs: {
      incompleteItemsCountMessage:
        '{invalidItemsCount} incomplete {invalidItemsCount, plural, one {question} other {questions}}',
      dialogSubmitBtnLabel: 'Submit',
      dialogCancelBtnLabel: 'Cancel',
    },
    components: {
      AssessmentEditor,
      DialogBox,
    },
    computed: {
      ...mapState('edit_modal', ['selectedIndices', 'dialog']),
      ...mapGetters('edit_modal', [
        'getNode',
        'nodeAssessmentDraft',
        'isNodeAssessmentDraftValid',
        'invalidNodeAssessmentDraftItemsCount',
      ]),
      // assessment view is accessible only when exactly one exercise node is selected
      nodeIndex() {
        return this.selectedIndices[0];
      },
      node() {
        return this.getNode(this.nodeIndex);
      },
      nodeId() {
        return this.node.id;
      },
      assessmentDraft() {
        return this.nodeAssessmentDraft(this.nodeId);
      },
      invalidItemsErrorMessage() {
        const invalidItemsCount = this.invalidNodeAssessmentDraftItemsCount(this.nodeId);

        if (!invalidItemsCount) {
          return '';
        }

        return this.$tr('incompleteItemsCountMessage', { invalidItemsCount });
      },
    },
    watch: {
      selectedIndices() {
        this.$refs.assessmentEditor.reset();
      },
    },
    created() {
      if (this.nodeAssessmentDraft(this.nodeId) !== null) {
        return;
      }

      this.initializeNodeAssessmentDraft({
        nodeId: this.nodeId,
        assessmentItems: this.node.assessment_items,
      });

      this.sanitizeNodeAssessmentDraft({ nodeId: this.nodeId });
      this.validateNodeAssessmentDraft({ nodeId: this.nodeId });
    },
    methods: {
      ...mapMutations('edit_modal', [
        'initializeNodeAssessmentDraft',
        'setNodeAssessmentDraft',
        'sanitizeNodeAssessmentDraft',
        'validateNodeAssessmentDraft',
        'openDialog',
      ]),
      onAssessmentDraftUpdate(assessmentDraft) {
        this.setNodeAssessmentDraft({ nodeId: this.nodeId, assessmentDraft });
      },
    },
  };

</script>
