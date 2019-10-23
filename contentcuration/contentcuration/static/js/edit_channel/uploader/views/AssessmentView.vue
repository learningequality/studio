<template>
  <div>
    <VAlert
      :value="!areAssessmentItemsValid"
      icon="error"
      type="error"
      outline
      data-test="alert"
    >
      <span class="red--text font-weight-bold">{{ invalidItemsErrorMessage }}</span>
    </VAlert>

    <AssessmentEditor
      ref="assessmentEditor"
      v-model="assessmentItems"
      :itemsValidation="assessmentItemsValidation"
      :openDialog="openDialog"
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
        'nodeAssessmentItems',
        'nodeErrors',
        'areNodeAssessmentItemsValid',
        'invalidNodeAssessmentItemsCount',
      ]),
      // assessment view is accessible only when exactly one exercise node is selected
      nodeIdx() {
        return this.selectedIndices[0];
      },
      node() {
        return this.getNode(this.nodeIdx);
      },
      assessmentItems: {
        get() {
          return this.nodeAssessmentItems(this.nodeIdx);
        },
        set(value) {
          this.setNodeAssessmentItems({ nodeIdx: this.nodeIdx, assessmentItems: value });
          this.validateNodeAssessmentItems({ nodeIdx: this.nodeIdx });
        },
      },
      assessmentItemsValidation() {
        if (!this.nodeErrors(this.nodeIdx) || !this.nodeErrors(this.nodeIdx).assessment_items) {
          return [];
        }

        return this.nodeErrors(this.nodeIdx).assessment_items;
      },
      areAssessmentItemsValid() {
        return this.areNodeAssessmentItemsValid(this.nodeIdx);
      },
      invalidItemsErrorMessage() {
        const invalidItemsCount = this.invalidNodeAssessmentItemsCount(this.nodeIdx);

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
    methods: {
      ...mapMutations('edit_modal', {
        openDialog: 'OPEN_DIALOG',
        setNodeAssessmentItems: 'SET_NODE_ASSESSMENT_ITEMS',
        validateNodeAssessmentItems: 'VALIDATE_NODE_ASSESSMENT_ITEMS',
      }),
    },
  };

</script>
