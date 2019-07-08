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

    <VCheckbox
      v-model="displayAnswersPreview"
      label="Show answers"
      class="mt-4"
      data-test="showAnswersCheckbox"
    />

    <template v-if="assessmentItemsData && assessmentItemsData.length">
      <AssessmentItem
        v-for="(_, itemIdx) in assessmentItemsData"
        :key="itemIdx"
        :nodeId="nodeId"
        :itemIdx="itemIdx"
        :isOpen="itemIdx === openItemIdx"
        :displayAnswersPreview="displayAnswersPreview"
        @close="onItemClose(itemIdx)"
        @open="onItemOpen(itemIdx)"
        @delete="onDeleteItem(itemIdx)"
        @moveUp="onMoveItemUp(itemIdx)"
        @moveDown="onMoveItemDown(itemIdx)"
        @addItemAbove="onAddItemAbove(itemIdx)"
        @addItemBelow="onAddItemBelow(itemIdx)"
      />
    </template>

    <div v-else>
      No questions yet
    </div>

    <VBtn
      color="primary"
      data-test="newQuestionBtn"
      @click="onNewItemBtnClick"
    >
      New question
    </VBtn>

    <!-- TODO @MisRob: Move to EditModal and merge with existing Dialog component -->
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
          Cancel
        </VBtn>

        <VBtn
          color="primary"
          flat
          data-test="dialogSubmitBtn"
          @click="dialog.onSubmit"
        >
          {{ dialog.submitLabel }}
        </VBtn>
      </template>
    </DialogBox>
  </div>
</template>

<script>

  import { mapState, mapGetters, mapMutations } from 'vuex';
  import AssessmentItem from '../components/AssessmentItem/AssessmentItem.vue';
  import DialogBox from '../components/DialogBox/DialogBox.vue';

  export default {
    name: 'AssessmentView',
    components: {
      AssessmentItem,
      DialogBox,
    },
    data() {
      return {
        openItemIdx: null,
        displayAnswersPreview: false,
      };
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
      assessmentItemsData() {
        return this.nodeAssessmentDraft(this.nodeId).map(item => item.data);
      },
      invalidItemsErrorMessage() {
        const invalidItemsCount = this.invalidNodeAssessmentDraftItemsCount(this.nodeId);

        if (invalidItemsCount === 1) {
          return '1 incomplete question';
        }

        if (invalidItemsCount > 1) {
          return `${invalidItemsCount} incomplete questions`;
        }

        return '';
      },
    },
    watch: {
      selectedIndices(newSelectedIndices, oldSelectedIndices) {
        // TODO: as soon as we have routing, this should be rather placed
        // in beforeRouteLeave navigation guard and we should not allow
        // leaving this exercise route before fixing all errors
        // (insted of changing selected nodes index back)
        // ------------------------------------------------------------------

        // assessment view is accessible only when exactly one exercise node is selected
        const oldNodeIndex = oldSelectedIndices[0];
        const oldNodeId = this.getNode(oldNodeIndex).id;

        this.sanitizeNodeAssessmentDraft({ nodeId: oldNodeId });
        this.validateNodeAssessmentDraft({ nodeId: oldNodeId });

        if (!this.isNodeAssessmentDraftValid(oldNodeId)) {
          this.SELECT_NODE(oldNodeIndex);

          // TODO @MisRob display dialog
          return;
        }

        this.closeOpenItem();
      },
    },
    created() {
      if (this.nodeAssessmentDraft(this.nodeId) !== null) {
        return;
      }

      this.addNodeAssessmentDraft({
        nodeId: this.nodeId,
        assessmentItems: this.node.assessment_items,
      });
    },
    methods: {
      ...mapMutations('edit_modal', [
        'SELECT_NODE',
        'addNodeAssessmentDraft',
        'sanitizeNodeAssessmentDraft',
        'validateNodeAssessmentDraft',
        'addNodeAssessmentDraftItem',
        'updateNodeAssessmentDraftItemData',
        'deleteNodeAssessmentDraftItem',
        'swapNodeAssessmentDraftItems',
        'sanitizeNodeAssessmentDraftItem',
        'validateNodeAssessmentDraftItem',
        'openDialog',
      ]),
      openItem(itemIdx) {
        this.openItemIdx = itemIdx;
      },
      closeOpenItem() {
        this.openItemIdx = null;
      },
      validateOpenItem() {
        if (this.openItemIdx !== null) {
          this.sanitizeNodeAssessmentDraftItem({
            nodeId: this.nodeId,
            assessmentItemIdx: this.openItemIdx,
            removeEmpty: true,
          });

          this.validateNodeAssessmentDraftItem({
            nodeId: this.nodeId,
            assessmentItemIdx: this.openItemIdx,
          });
        }
      },
      sanitizeItems() {
        this.sanitizeNodeAssessmentDraft({ nodeId: this.nodeId });
      },
      deleteItem(itemIdx) {
        this.deleteNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          assessmentItemIdx: itemIdx,
        });

        if (this.openItemIdx === itemIdx) {
          this.closeOpenItem();
        } else if (this.openItemIdx > itemIdx) {
          this.openItem(this.openItemIdx - 1);
        }
      },
      swapItems(firstItemIdx, secondItemIdx) {
        this.validateOpenItem();

        this.swapNodeAssessmentDraftItems({
          nodeId: this.nodeId,
          firstItemIdx,
          secondItemIdx,
        });

        if (this.openItemIdx === firstItemIdx) {
          this.openItem(secondItemIdx);
          return;
        }
        if (this.openItemIdx === secondItemIdx) {
          this.openItem(firstItemIdx);
          return;
        }
      },
      onItemOpen(itemIdx) {
        this.validateOpenItem();

        this.openItem(itemIdx);
      },
      onItemClose() {
        this.validateOpenItem();
        this.closeOpenItem();
      },
      onDeleteItem(itemIdx) {
        this.openDialog({
          title: 'Deleting question',
          message: 'Are you sure you want to delete this question?',
          submitLabel: 'Delete',
          onSubmit: () => this.deleteItem(itemIdx),
        });
      },
      onNewItemBtnClick() {
        this.validateOpenItem();
        // primarily to disable adding more empty questions
        this.sanitizeItems();

        this.addNodeAssessmentDraftItem({ nodeId: this.nodeId });

        this.openItem(this.assessmentItemsData.length - 1);
      },
      onAddItemAbove(itemIdx) {
        this.validateOpenItem();
        // primarily to disable adding more empty questions
        this.sanitizeItems();

        this.addNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          before: itemIdx,
        });

        this.openItem(itemIdx);
      },
      onAddItemBelow(itemIdx) {
        this.validateOpenItem();
        // primarily to disable adding more empty questions
        this.sanitizeItems();

        this.addNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          after: itemIdx,
        });

        this.openItem(itemIdx + 1);
      },
      onMoveItemUp(itemIdx) {
        this.swapItems(itemIdx, itemIdx - 1);
      },
      onMoveItemDown(itemIdx) {
        this.swapItems(itemIdx, itemIdx + 1);
      },
    },
  };

</script>
