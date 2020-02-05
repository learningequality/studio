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

  import { mapGetters, mapActions } from 'vuex';

  import AssessmentEditor from '../components/AssessmentEditor/AssessmentEditor.vue';
  import DialogBox from '../components/DialogBox/DialogBox.vue';

  export default {
    name: 'AssessmentView',
    components: {
      AssessmentEditor,
      DialogBox,
    },
    data() {
      return {
        dialog: {
          open: false,
          title: null,
          message: null,
          onCancel: null,
          cancelLabel: null,
          onSubmit: null,
          submitLabel: null,
        }
      };
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('assessmentItem', [
        'getNodeAssessmentItems',
        'getNodeAssessmentItemErrors',
        'areNodeAssessmentItemsValid',
        'getInvalidNodeAssessmentItemsCount',
      ]),
      assessmentItems: {
        get() {
          return this.getNodeAssessmentItems(this.nodeId);
        },
        set(value) {
          this.updateAssessmentItems(value);
        },
      },
      areAssessmentItemsValid() {
        return this.areNodeAssessmentItemsValid(this.nodeId);
      },
      assessmentItemsValidation() {
        return this.getNodeAssessmentItemErrors(this.nodeId);
      },
      invalidItemsErrorMessage() {
        const invalidItemsCount = this.getInvalidNodeAssessmentItemsCount(this.nodeId);

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
      ...mapActions('assessmentItem', ['updateAssessmentItems']),
      openDialog({
         title = null,
         message = null,
         cancelLabel = null,
         submitLabel = null,
         onCancel = null,
         onSubmit = null,
       } = {}) {
        Object.assign(this.dialog, {
          title,
          message,
          cancelLabel,
          submitLabel,
          onCancel,
          onSubmit,
        });
        this.dialog.open = true;
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
