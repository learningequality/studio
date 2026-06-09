<template>

  <div>
    <VContainer
      v-show="!areAssessmentItemsValid"
      fluid
      class="pb-0"
      :style="alertStyle"
    >
      <VAlert
        :value="true"
        icon="error"
        type="error"
        outline
        data-test="alert"
      >
        <span class="font-weight-bold red--text">{{ invalidItemsErrorMessage }}</span>
      </VAlert>
    </VContainer>

    <AssessmentEditor
      ref="assessmentEditor"
      :nodeId="nodeId"
      :items="assessmentItems"
      :itemsErrors="assessmentItemsErrors"
      :openDialog="openDialog"
      :windowIsSmall="windowIsSmall"
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
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  import AssessmentEditor from '../AssessmentEditor/AssessmentEditor';

  export default {
    name: 'AssessmentTab',
    components: {
      AssessmentEditor,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return { windowIsSmall };
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
      alertStyle() {
        return this.windowIsSmall ? {} : { maxWidth: '85%', margin: '0 auto' };
      },
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
