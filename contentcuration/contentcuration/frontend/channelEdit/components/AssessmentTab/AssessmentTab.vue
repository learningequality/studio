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
      @addItem="onAddAssessmentItem"
      @updateItem="onUpdateAssessmentItem"
      @updateItems="onUpdateAssessmentItems"
      @deleteItem="onDeleteAssessmentItem"
    />

    <KModal
      v-if="dialog.open"
      :title="dialog.title"
      :cancelText="dialog.cancelLabel || $tr('dialogCancelBtnLabel')"
      :submitText="dialog.submitLabel || $tr('dialogSubmitBtnLabel')"
      @cancel="dialog.onCancel"
      @submit="dialog.onSubmit"
    >
      {{ dialog.message }}
    </KModal>
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';

  import AssessmentEditor from '../AssessmentEditor/AssessmentEditor';

  export default {
    name: 'AssessmentTab',
    components: {
      AssessmentEditor,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
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
      areAssessmentItemsValid() {
        return this.getAssessmentItemsAreValid({
          contentNodeId: this.nodeId,
          ignoreDelayed: true,
        });
      },
      assessmentItemsErrors() {
        const errorMap = this.getAssessmentItemsErrors({
          contentNodeId: this.nodeId,
          ignoreDelayed: true,
        });
        return errorMap;
      },
      invalidItemsErrorMessage() {
        const invalidItemsCount = this.getInvalidAssessmentItemsCount({
          contentNodeId: this.nodeId,
          ignoreDelayed: true,
        });
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
