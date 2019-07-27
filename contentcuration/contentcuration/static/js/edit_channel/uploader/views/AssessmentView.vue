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
      class="mt-4 ml-0"
      data-test="showAnswersCheckbox"
    />

    <template v-if="assessmentItemsData && assessmentItemsData.length">
      <VCard
        v-for="(itemData, itemIdx) in assessmentItemsData"
        :key="itemIdx"
        pa-1
        :class="itemClasses(itemIdx)"
        data-test="assessmentItem"
        @click="onItemClick($event, itemIdx)"
      >
        <VCardText>
          <VLayout align-start>
            <VFlex xs1 mt-2>
              {{ itemData.order + 1 }}
            </VFlex>

            <VFlex v-if="!isItemOpen(itemIdx)" xs10>
              <AssessmentItemPreview
                :question="itemData.question"
                :kind="itemData.type"
                :answers="itemData.answers"
                :hints="itemData.hints"
                :detailed="displayAnswersPreview"
              />
            </VFlex>

            <VFlex xs10>
              <AssessmentItemEditor
                v-if="isItemOpen(itemIdx)"
                :nodeId="nodeId"
                :itemIdx="itemIdx"
                data-test="assessmentItemEditor"
                @close="onItemClose"
              />
            </VFlex>

            <VSpacer />

            <VLayout align-center class="toolbar">
              <VFlex
                v-if="!isItemOpen(itemIdx) && !isItemValid(itemIdx)"
                mr-2
              >
                <template v-if="$vuetify.breakpoint.lgAndUp">
                  <VIcon class="red--text">
                    error
                  </VIcon>
                  <span class="red--text font-weight-bold">
                    Incomplete
                  </span>
                </template>

                <VTooltip v-else top>
                  <template slot="activator" slot-scope="{ on }">
                    <VIcon class="red--text" v-on="on">
                      error
                    </VIcon>
                  </template>
                  <span>Incomplete</span>
                </VTooltip>
              </VFlex>

              <VFlex>
                <AssessmentItemToolbar
                  itemLabel="question"
                  :displayDeleteIcon="false"
                  :displayEditIcon="!isItemOpen(itemIdx)"
                  :canMoveUp="!isItemFirst(itemIdx)"
                  :canMoveDown="!isItemLast(itemIdx)"
                  :collapse="!$vuetify.breakpoint.mdAndUp"
                  @click="onToolbarClick(itemIdx, $event)"
                />
              </VFlex>
            </VLayout>
          </VLayout>

          <VLayout v-if="isItemOpen(itemIdx)" justify-end>
            <VBtn
              flat
              class="close-item-btn mr-0"
              data-test="closeBtn"
              @click="closeOpenItem"
            >
              Close
            </VBtn>
          </VLayout>
        </VCardText>
      </VCard>
    </template>

    <div v-else>
      No questions yet
    </div>

    <VBtn
      color="primary"
      class="mt-4 ml-0"
      data-test="newQuestionBtn"
      @click="onNewItemBtnClick"
    >
      New question
    </VBtn>

    <!-- TODO @MisRob: As soon as we know how dialogs should behave within the context
    of the whole edit modal, move to a more appropriate place (EditModal.vue maybe?)
    and merge with existing Dialog component -->
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

  import AssessmentItemEditor from '../components/AssessmentItemEditor/AssessmentItemEditor.vue';
  import AssessmentItemPreview from '../components/AssessmentItemPreview/AssessmentItemPreview.vue';
  import AssessmentItemToolbar from '../components/AssessmentItemToolbar/AssessmentItemToolbar.vue';
  import DialogBox from '../components/DialogBox/DialogBox.vue';

  export default {
    name: 'AssessmentView',
    components: {
      AssessmentItemEditor,
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
      itemClasses(itemIdx) {
        const classes = ['item'];

        if (!this.isItemOpen(itemIdx)) {
          classes.push('closed');
        }

        return classes;
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

  @import '../../../../less/global-variables.less';

  .item {
    position: relative;
    margin: 8px -4px;

    .toolbar {
      position: absolute;
      right: 10px;
    }

    &.closed {
      margin: 0 4px;
      cursor: pointer;
    }
  }

</style>
