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
      <VCard
        v-for="(itemData, itemIdx) in assessmentItemsData"
        :key="itemIdx"
        class="pa-1 item"
        data-test="assessmentItem"
        :style="itemStyle(itemIdx)"
        @click="onItemClick($event, itemIdx)"
      >
        <VCardText>
          <!-- eslint-disable-next-line -->
          <VLayout align-start>
            <VFlex xs1>
              {{ itemData.order + 1 }}
            </VFlex>

            <VFlex
              v-if="!isItemOpen(itemIdx)"
              xs6
              lg8
            >
              <AssessmentItemPreview
                :question="itemData.question"
                :kind="itemData.type"
                :answers="itemData.answers"
                :hints="itemData.hints"
                :detailed="displayAnswersPreview"
                :isInvalid="!isItemValid(itemIdx)"
              />
            </VFlex>

            <VFlex>
              <AssessmentItemEdit
                v-if="isItemOpen(itemIdx)"
                :nodeId="nodeId"
                :itemIdx="itemIdx"
                data-test="assessmentItemEdit"
                @close="onItemClose"
              />

              <!-- eslint-disable-next-line -->
              <VLayout v-if="isItemOpen(itemIdx)" justify-end>
                <VBtn
                  flat
                  color="primary"
                  class="close-item-btn mr-0"
                  data-test="closeBtn"
                  @click="closeOpenItem"
                >
                  Close
                </VBtn>
              </VLayout>
            </VFlex>

            <VSpacer />

            <AssessmentItemToolbar
              itemLabel="question"
              :displayDeleteIcon="false"
              :displayEditIcon="!isItemOpen(itemIdx)"
              :canMoveUp="!isItemFirst(itemIdx)"
              :canMoveDown="!isItemLast(itemIdx)"
              :collapse="!$vuetify.breakpoint.mdAndUp"
              class="toolbar"
              @click="onToolbarClick(itemIdx, $event)"
            />
          </VLayout>
        </VCardText>
      </VCard>
    </template>

    <div v-else>
      No questions yet
    </div>

    <VBtn
      color="primary"
      class="mt-3"
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

  import { AssessmentItemToolbarActions } from '../constants';

  import AssessmentItemEdit from '../components/AssessmentItemEdit/AssessmentItemEdit.vue';
  import AssessmentItemPreview from '../components/AssessmentItemPreview/AssessmentItemPreview.vue';
  import AssessmentItemToolbar from '../components/AssessmentItemToolbar/AssessmentItemToolbar.vue';
  import DialogBox from '../components/DialogBox/DialogBox.vue';

  export default {
    name: 'AssessmentView',
    components: {
      AssessmentItemEdit,
      AssessmentItemPreview,
      AssessmentItemToolbar,
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
        'isNodeAssessmentDraftItemValid',
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
      isItemOpen(itemIdx) {
        return this.openItemIdx === itemIdx;
      },
      isItemFirst(itemIdx) {
        return itemIdx === 0;
      },
      isItemLast(itemIdx) {
        return itemIdx === this.nodeAssessmentDraft(this.nodeId).length - 1;
      },
      isItemValid(itemIdx) {
        return this.isNodeAssessmentDraftItemValid({
          nodeId: this.nodeId,
          assessmentItemIdx: itemIdx,
        });
      },
      itemStyle(itemIdx) {
        if (this.isItemOpen(itemIdx)) {
          return {
            margin: '8px 0',
          };
        }

        return {
          margin: '0 8px',
          cursor: 'pointer',
        };
      },
      onItemClick(event, itemIdx) {
        if (this.isItemOpen(itemIdx)) {
          return;
        }

        if (
          event.target.closest('.close-item-btn') !== null ||
          event.target.closest('.toolbar') !== null ||
          event.target.closest('.hints-preview') !== null
        ) {
          return;
        }

        this.validateOpenItem();
        this.openItem(itemIdx);
      },
      onToolbarClick(itemIdx, action) {
        switch (action) {
          case AssessmentItemToolbarActions.EDIT_ITEM:
            this.validateOpenItem();
            this.openItem(itemIdx);
            break;

          case AssessmentItemToolbarActions.DELETE_ITEM:
            this.openDialog({
              title: 'Deleting question',
              message: 'Are you sure you want to delete this question?',
              submitLabel: 'Delete',
              onSubmit: () => this.deleteItem(itemIdx),
            });
            break;

          case AssessmentItemToolbarActions.ADD_ITEM_ABOVE:
            this.validateOpenItem();
            // primarily to disable adding more empty questions
            this.sanitizeItems();

            this.addNodeAssessmentDraftItem({
              nodeId: this.nodeId,
              before: itemIdx,
            });

            this.openItem(itemIdx);
            break;

          case AssessmentItemToolbarActions.ADD_ITEM_BELOW:
            this.validateOpenItem();
            // primarily to disable adding more empty questions
            this.sanitizeItems();

            this.addNodeAssessmentDraftItem({
              nodeId: this.nodeId,
              after: itemIdx,
            });

            this.openItem(itemIdx + 1);
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_UP:
            if (this.isItemFirst(itemIdx)) {
              break;
            }

            this.swapItems(itemIdx, itemIdx - 1);
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_DOWN:
            if (this.isItemLast(itemIdx)) {
              break;
            }

            this.swapItems(itemIdx, itemIdx + 1);
            break;
        }
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
      onItemClose() {
        this.validateOpenItem();
        this.closeOpenItem();
      },
      onNewItemBtnClick() {
        this.validateOpenItem();
        // primarily to disable adding more empty questions
        this.sanitizeItems();

        this.addNodeAssessmentDraftItem({ nodeId: this.nodeId });

        this.openItem(this.assessmentItemsData.length - 1);
      },
    },
  };

</script>

<style lang="less" scoped>
  .item {
    position: relative;

    .toolbar {
      position: absolute;
      right: 10px;
    }
  }

</style>
