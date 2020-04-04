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
      :nodeId="nodeId"
      :itemsValidation="assessmentItemsValidation"
      :openDialog="openDialog"
    />

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

  import { mapGetters, mapActions } from 'vuex';

  import AssessmentEditor from '../AssessmentEditor/AssessmentEditor';
  import DialogBox from 'shared/views/DialogBox';

  export default {
    name: 'AssessmentTab',
    components: {
      AssessmentEditor,
      DialogBox,
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
      assessmentItems: {
        get() {
          return this.getAssessmentItems(this.nodeId);
        },
        set(value) {
          this.updateAssessmentItems(value);
        },
      },
      areAssessmentItemsValid() {
        return this.getAssessmentItemsAreValid(this.nodeId);
      },
      assessmentItemsValidation() {
        return this.getAssessmentItemsErrors(this.nodeId);
      },
      invalidItemsErrorMessage() {
        const invalidItemsCount = this.getInvalidAssessmentItemsCount(this.nodeId);

        if (!invalidItemsCount) {
          return '';
        }

        return this.$tr('incompleteItemsCountMessage', { invalidItemsCount });
      },
    },
    methods: {
      ...mapActions('assessmentItem', ['updateAssessmentItems']),
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
