<template>
  <div>
    <template v-if="assessmentDraft && assessmentDraft.length">
      <VCheckbox
        v-model="displayAnswersPreview"
        label="Show answers"
        class="mt-4 ml-0"
        data-test="showAnswersCheckbox"
      />

      <VCard
        v-for="(_, itemIdx) in assessmentDraft"
        :key="itemIdx"
        pa-1
        :class="itemClasses(itemIdx)"
        data-test="item"
        @click="onItemClick($event, itemIdx)"
      >
        <VCardText>
          <VLayout align-start>
            <VFlex xs1 mt-2>
              {{ itemOrder(itemIdx) }}
            </VFlex>

            <VFlex
              v-if="!isItemOpen(itemIdx)"
              xs10
            >
              <AssessmentItemPreview
                :itemData="assessmentDraft[itemIdx].data"
                :detailed="displayAnswersPreview"
              />
            </VFlex>

            <VFlex
              v-else
              xs10
            >
              <AssessmentItemEditor
                :item="assessmentDraft[itemIdx]"
                :openDialog="openDialog"
                data-test="editor"
                @update="updateItem($event, itemIdx)"
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
                    {{ $tr('incompleteItemIndicatorLabel') }}
                  </span>
                </template>

                <VTooltip v-else top>
                  <template slot="activator" slot-scope="{ on }">
                    <VIcon class="red--text" v-on="on">
                      error
                    </VIcon>
                  </template>
                  <span>{{ $tr('incompleteItemIndicatorLabel') }}</span>
                </VTooltip>
              </VFlex>

              <VFlex>
                <AssessmentItemToolbar
                  :iconActionsConfig="toolbarIconActions(itemIdx)"
                  :displayMenu="true"
                  :menuActionsConfig="toolbarMenuActions"
                  :canMoveUp="!isItemFirst(itemIdx)"
                  :canMoveDown="!isItemLast(itemIdx)"
                  :collapse="!$vuetify.breakpoint.mdAndUp"
                  :itemLabel="$tr('toolbarItemLabel')"
                  @click="onToolbarClick($event, itemIdx)"
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
              {{ $tr('closeBtnLabel') }}
            </VBtn>
          </VLayout>
        </VCardText>
      </VCard>
    </template>

    <div v-else>
      {{ $tr('noQuestionsPlaceholder') }}
    </div>

    <VBtn
      color="primary"
      class="mt-4 ml-0"
      data-test="newQuestionBtn"
      @click="addNewItem"
    >
      {{ $tr('newQuestionBtnLabel') }}
    </VBtn>
  </div>
</template>

<script>

  import { AssessmentItemTypes, AssessmentItemToolbarActions } from '../../constants';
  import {
    isAssessmentDraftItemValid,
    updateAssessmentDraftOrder,
    sanitizeAssessmentDraft,
    validateAssessmentDraft,
    sanitizeAssessmentItem,
    validateAssessmentItem,
    insertAfter,
    insertBefore,
    swapElements,
  } from '../../utils';

  import AssessmentItemEditor from '../AssessmentItemEditor/AssessmentItemEditor.vue';
  import AssessmentItemPreview from '../AssessmentItemPreview/AssessmentItemPreview.vue';
  import AssessmentItemToolbar from '../AssessmentItemToolbar/AssessmentItemToolbar.vue';

  export default {
    name: 'AssessmentEditor',
    $trs: {
      incompleteItemIndicatorLabel: 'Incomplete',
      incompleteItemsCountMessage:
        '{invalidItemsCount} incomplete {invalidItemsCount, plural, one {question} other {questions}}',
      toolbarItemLabel: 'question',
      noQuestionsPlaceholder: 'No questions yet',
      closeBtnLabel: 'Close',
      newQuestionBtnLabel: 'New question',
      dialogTitle: 'Deleting question',
      dialogMessage: 'Are you sure you want to delete this question?',
      dialogSubmitBtnLabel: 'Delete',
    },
    components: {
      AssessmentItemEditor,
      AssessmentItemPreview,
      AssessmentItemToolbar,
    },
    model: {
      prop: 'assessmentDraft',
      event: 'update',
    },
    props: {
      /**
       * An array of assessment draft items where item looks like
       * {
       *   // assessment item data as retrieved from API
       *   data: {
       *      question
       *      type
       *      order
       *      answers
       *      hints
       *      ...
       *   },
       *   // client validation data for the assessment item
       *   validation: {
       *      questionErrors
       *      answerErrors
       *   }
       * }
       */
      assessmentDraft: {
        type: Array,
      },
      /**
       * Inject a function that opens a dialog that should
       * be confirmed before certain actions can be performed.
       * If not provided, no confirmation will be required.
       * Expected interface:
       *   openDialog({
       *     title: String,
       *     message: String,
       *     cancelLabel: String,
       *     submitLabel: String,
       *     onCancel: Function,
       *     onSubmit: Function,
       *   })
       * })
       */
      openDialog: {
        type: Function,
      },
    },
    data() {
      return {
        openItemIdx: null,
        displayAnswersPreview: false,
        toolbarMenuActions: [
          AssessmentItemToolbarActions.ADD_ITEM_ABOVE,
          AssessmentItemToolbarActions.ADD_ITEM_BELOW,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
      };
    },
    mounted() {
      if (!this.assessmentDraft) {
        return;
      }

      let newAssessmentDraft = [...this.assessmentDraft];
      newAssessmentDraft = sanitizeAssessmentDraft(newAssessmentDraft);
      newAssessmentDraft = validateAssessmentDraft(newAssessmentDraft);

      this.$emit('update', newAssessmentDraft);
    },
    methods: {
      /**
       * @public
       */
      reset() {
        this.closeOpenItem();
        this.displayAnswersPreview = false;
      },
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
        return itemIdx === this.assessmentDraft.length - 1;
      },
      isItemValid(itemIdx) {
        return isAssessmentDraftItemValid(this.assessmentDraft[itemIdx]);
      },
      itemOrder(itemIdx) {
        if (!this.assessmentDraft[itemIdx].data) {
          return '1';
        }

        return this.assessmentDraft[itemIdx].data.order + 1;
      },
      itemClasses(itemIdx) {
        const classes = ['item'];

        if (!this.isItemOpen(itemIdx)) {
          classes.push('closed');
        }

        return classes;
      },
      toolbarIconActions(itemIdx) {
        const actions = [
          [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
          [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
        ];

        if (!this.isItemOpen(itemIdx)) {
          actions.unshift([AssessmentItemToolbarActions.EDIT_ITEM, { collapse: false }]);
        }

        return actions;
      },
      beforeItemClose() {
        if (
          this.openItemIdx === null ||
          !this.assessmentDraft ||
          this.assessmentDraft[this.openItemIdx] === undefined
        ) {
          return;
        }

        const openItem = { ...this.assessmentDraft[this.openItemIdx] };
        openItem.data = sanitizeAssessmentItem(openItem.data, true);
        openItem.validation = validateAssessmentItem(openItem.data);

        const newAssessmentDraft = [...this.assessmentDraft];
        newAssessmentDraft[this.openItemIdx] = openItem;

        this.$emit('update', newAssessmentDraft);
      },
      editItem(itemIdx) {
        this.beforeItemClose();
        this.openItem(itemIdx);
      },
      updateItem(newItem, itemIdx) {
        const item = { ...newItem };
        item.data = sanitizeAssessmentItem(item.data);
        item.validation = validateAssessmentItem(item.data);

        const newAssessmentDraft = [...this.assessmentDraft];
        newAssessmentDraft[itemIdx] = item;

        this.$emit('update', newAssessmentDraft);
      },
      addNewItem({ before, after }) {
        this.beforeItemClose();

        let newAssessmentDraft = [];
        if (this.assessmentDraft) {
          newAssessmentDraft = [...this.assessmentDraft];
        }

        // disable adding more empty items
        newAssessmentDraft = sanitizeAssessmentDraft(newAssessmentDraft);

        const newItem = {
          data: {
            question: '',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            answers: [],
            hints: [],
          },
          validation: {},
        };
        newItem.validation = validateAssessmentItem(newItem.data);

        if (after !== undefined) {
          newAssessmentDraft = insertAfter(newAssessmentDraft, after, newItem);
        } else if (before !== undefined) {
          newAssessmentDraft = insertBefore(newAssessmentDraft, before, newItem);
        } else {
          newAssessmentDraft.push(newItem);
        }

        newAssessmentDraft = updateAssessmentDraftOrder(newAssessmentDraft);

        this.$emit('update', newAssessmentDraft);

        if (after !== undefined) {
          // this happens when adding a new item below an empty item
          // because in such situation, the first empty item is removed
          // to disable displaying more empty items
          if (newAssessmentDraft.length === 1) {
            this.openItem(0);
          } else {
            this.openItem(after + 1);
          }
        } else if (before !== undefined) {
          this.openItem(before);
        } else {
          this.openItem(newAssessmentDraft.length - 1);
        }
      },
      deleteItem(itemIdx) {
        let newAssessmentDraft = [...this.assessmentDraft];

        newAssessmentDraft.splice(itemIdx, 1);
        newAssessmentDraft = updateAssessmentDraftOrder(newAssessmentDraft);

        this.$emit('update', newAssessmentDraft);

        if (this.openItemIdx === itemIdx) {
          this.closeOpenItem();
        } else if (this.openItemIdx > itemIdx) {
          this.openItem(this.openItemIdx - 1);
        }
      },
      swapItems(firstItemIdx, secondItemIdx) {
        this.beforeItemClose();

        let newAssessmentDraft = [...this.assessmentDraft];

        newAssessmentDraft = swapElements(newAssessmentDraft, firstItemIdx, secondItemIdx);
        newAssessmentDraft = updateAssessmentDraftOrder(newAssessmentDraft);

        this.$emit('update', newAssessmentDraft);

        if (this.openItemIdx === firstItemIdx) {
          this.openItem(secondItemIdx);
          return;
        }
        if (this.openItemIdx === secondItemIdx) {
          this.openItem(firstItemIdx);
          return;
        }
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

        this.editItem(itemIdx);
      },
      onToolbarClick(action, itemIdx) {
        switch (action) {
          case AssessmentItemToolbarActions.EDIT_ITEM:
            this.editItem(itemIdx);
            break;

          case AssessmentItemToolbarActions.DELETE_ITEM:
            if (typeof this.openDialog === 'function') {
              this.openDialog({
                title: this.$tr('dialogTitle'),
                message: this.$tr('dialogMessage'),
                submitLabel: this.$tr('dialogSubmitBtnLabel'),
                onSubmit: () => this.deleteItem(itemIdx),
                onCancel: this.rerenderKindSelect,
              });
            } else {
              this.deleteItem(itemIdx);
            }

            break;

          case AssessmentItemToolbarActions.ADD_ITEM_ABOVE:
            this.addNewItem({ before: itemIdx });
            break;

          case AssessmentItemToolbarActions.ADD_ITEM_BELOW:
            this.addNewItem({ after: itemIdx });
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
      onItemClose() {
        this.beforeItemClose();
        this.closeOpenItem();
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../../less/global-variables.less';

  .item {
    position: relative;
    min-height: 75px;
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
