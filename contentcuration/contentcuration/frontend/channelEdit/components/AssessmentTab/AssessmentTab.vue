<template>

  <div>
    <VAlert
      :value="!areAssessmentItemsValid"
      icon="error"
      type="error"
      outline
      data-test="alert"
    >
      <span class="font-weight-bold red--text">{{ invalidItemsErrorMessage }}</span>
    </VAlert>

    <AssessmentEditor
      ref="assessmentEditor"
      :nodeId="nodeId"
      :items="assessmentItems"
      :itemsErrors="assessmentItemsErrors"
      :openDialog="openDialog"
      :modality="modality"
      @addItem="onAddAssessmentItem"
      @updateItem="onUpdateAssessmentItem"
      @updateItems="onUpdateAssessmentItems"
      @deleteItem="onDeleteAssessmentItem"
    />

    <MessageDialog
      v-model="dialog.open"
      :header="dialog.title"
      :text="dialog.message"
    >
      <template #buttons>
        <VBtn
          flat
          @click="dialog.onCancel"
        >
          {{ dialog.cancelLabel || $tr('dialogCancelBtnLabel') }}
        </VBtn>

        <VBtn
          color="primary"
          @click="dialog.onSubmit"
        >
          {{ dialog.submitLabel || $tr('dialogSubmitBtnLabel') }}
        </VBtn>
      </template>
    </MessageDialog>
  </div>

</template>

<script>

  import { mapGetters, mapActions } from 'vuex';

  import AssessmentEditor from '../AssessmentEditor/AssessmentEditor';
  import { ContentModalities, ValidationErrors } from '../../../shared/constants';
  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'AssessmentTab',
    components: {
      AssessmentEditor,
      MessageDialog,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      modality: {
        type: String,
        default: '',
        required: false,
      },
    },
    data() {
      return {
        dialog: {
          open: false,
          title: '',
          message: '',
          cancelLabel: '',
          submitLabel: '',
          onCancel: () => {},
          onSubmit: () => {},
        },
      };
    },
    computed: {
      ...mapGetters('assessmentItem', [
        'getAssessmentItems',
        'getAssessmentItemsErrors',
        'getAssessmentItemsAreValid',
        'getInvalidAssessmentItemsCount',
      ]),
      assessmentItems() {
        return this.getAssessmentItems(this.nodeId);
      },
      invalidFreeResponseQuestionPresent() {
        return this.modality!== ContentModalities.SURVEY && this.getAssessmentItems(this.nodeId).some(item => item.type === 'free_response');
      },
      areAssessmentItemsValid() {
        if(this.invalidFreeResponseQuestionPresent){
          return false;
        }
        return this.getAssessmentItemsAreValid({ contentNodeId: this.nodeId, ignoreDelayed: true });
      },
      assessmentItemsErrors() {
        const errorMap = this.getAssessmentItemsErrors(
          { contentNodeId: this.nodeId, ignoreDelayed: true }
        );
        if (this.modality !== ContentModalities.SURVEY) {
            const items = this.getAssessmentItems(this.nodeId);
            items.forEach(item => {
              if (item.type === 'free_response') {
                errorMap[item.assessment_id] =
                [ValidationErrors.INVALID_COMPLETION_TYPE_FOR_FREE_RESPONSE_QUESTION];
              }
        });
      }
        return errorMap;
      },
      invalidItemsErrorMessage() {
        let invalidItemsCount = this.getInvalidAssessmentItemsCount({
          contentNodeId: this.nodeId,
          ignoreDelayed: true,
        });
        if (this.invalidFreeResponseQuestionPresent) {
          const invalidFreeResponseQuestionCount = this.getAssessmentItems(this.nodeId).filter(item => item.type === 'free_response').length;
          invalidItemsCount = invalidItemsCount + invalidFreeResponseQuestionCount;
        }
        if (!invalidItemsCount) {
          return '';
        }

        return this.$tr('incompleteItemsCountMessage', { invalidItemsCount });
      },
    },
    methods: {
      ...mapActions('assessmentItem', [
        'addAssessmentItem',
        'updateAssessmentItem',
        'updateAssessmentItems',
        'deleteAssessmentItem',
      ]),
      async onAddAssessmentItem(item) {
        await this.addAssessmentItem(item);
      },
      async onUpdateAssessmentItem(item) {
        await this.updateAssessmentItem(item);
      },
      async onUpdateAssessmentItems(items) {
        await this.updateAssessmentItems(items);
      },
      async onDeleteAssessmentItem(item) {
        await this.deleteAssessmentItem(item);
      },
      openDialog({
        title = '',
        message = '',
        cancelLabel = '',
        submitLabel = '',
        onCancel = () => {},
        onSubmit = () => {},
      } = {}) {
        this.dialog = {
          open: true,
          title,
          message,
          cancelLabel,
          submitLabel,
          onCancel: () => {
            if (typeof onCancel === 'function') {
              onCancel();
            }
            this.closeDialog();
          },
          onSubmit: () => {
            if (typeof onSubmit === 'function') {
              onSubmit();
            }
            this.closeDialog();
          },
        };
      },
      closeDialog() {
        this.dialog = {
          open: false,
          title: '',
          message: '',
          cancelLabel: '',
          submitLabel: '',
          onCancel: () => {},
          onSubmit: () => {},
        };
      },
    },
    $trs: {
      incompleteItemsCountMessage:
        '{invalidItemsCount} incomplete {invalidItemsCount, plural, one {question} other {questions}}',
      dialogSubmitBtnLabel: 'Submit',
      dialogCancelBtnLabel: 'Cancel',
    },
  };

</script>
