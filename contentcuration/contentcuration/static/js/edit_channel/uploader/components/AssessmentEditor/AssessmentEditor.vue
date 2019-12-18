<template>

  <div>
    <template v-if="items && items.length">
      <VCheckbox
        v-model="displayAnswersPreview"
        label="Show answers"
        class="mt-4 ml-0"
        data-test="showAnswersCheckbox"
      />

      <VCard
        v-for="(_, itemIdx) in items"
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
                :item="items[itemIdx]"
                :detailed="displayAnswersPreview"
              />
            </VFlex>

            <VFlex
              v-else
              xs10
            >
              <AssessmentItemEditor
                :item="items[itemIdx]"
                :errors="itemErrors(itemIdx)"
                :openDialog="openDialog"
                data-test="editor"
                @update="updateItem($event, itemIdx)"
                @close="closeOpenItem"
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
  import { insertAfter, insertBefore, swapElements } from '../../utils';

  import AssessmentItemEditor from '../AssessmentItemEditor/AssessmentItemEditor.vue';
  import AssessmentItemPreview from '../AssessmentItemPreview/AssessmentItemPreview.vue';
  import AssessmentItemToolbar from '../AssessmentItemToolbar/AssessmentItemToolbar.vue';

  const orderAssessmentItems = items => {
    return items.map((item, itemIdx) => {
      return {
        ...item,
        order: itemIdx,
      };
    });
  };

  export default {
    name: 'AssessmentEditor',
    components: {
      AssessmentItemEditor,
      AssessmentItemPreview,
      AssessmentItemToolbar,
    },
    model: {
      prop: 'items',
      event: 'update',
    },
    props: {
      /**
       * An array of assessment items:
       * [
       *   // an assessment item as retrieved from API
       *   {
       *     question
       *     type
       *     order
       *     answers
       *     hints
       *     ...
       *   },
       *   {
       *     question
       *     ...
       *   },
       *   ...
       * ]
       */
      items: {
        type: Array,
      },
      /**
       * An array of assessment items errors.
       * Each assessment item is assigned an array containing
       * all validation errors related to that item:
       * [
       *   [], // first assessment item errors
       *   []  // second assessment item errors
       * ]
       */
      itemsValidation: {
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
        return itemIdx === this.items.length - 1;
      },
      itemErrors(itemIdx) {
        if (!this.itemsValidation || !this.itemsValidation[itemIdx]) {
          return [];
        }

        return this.itemsValidation[itemIdx];
      },
      isItemValid(itemIdx) {
        return this.itemErrors(itemIdx).length === 0;
      },
      itemOrder(itemIdx) {
        if (!this.items[itemIdx] || this.items[itemIdx].order === undefined) {
          return 1;
        }

        return this.items[itemIdx].order + 1;
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
      editItem(itemIdx) {
        this.openItem(itemIdx);
      },
      updateItem(newItem, itemIdx) {
        const item = { ...newItem };

        const newItems = [...this.items];
        newItems[itemIdx] = item;

        this.$emit('update', newItems);
      },
      addNewItem({ before, after }) {
        let newItems = [];
        if (this.items) {
          newItems = [...this.items];
        }

        const newItem = {
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [],
          hints: [],
          isNew: true,
        };

        if (after !== undefined) {
          newItems = insertAfter(newItems, after, newItem);
        } else if (before !== undefined) {
          newItems = insertBefore(newItems, before, newItem);
        } else {
          newItems.push(newItem);
        }

        newItems = orderAssessmentItems(newItems);

        this.$emit('update', newItems);

        if (after !== undefined) {
          this.openItem(after + 1);
        } else if (before !== undefined) {
          this.openItem(before);
        } else {
          this.openItem(newItems.length - 1);
        }
      },
      deleteItem(itemIdx) {
        let newItems = [...this.items];

        newItems.splice(itemIdx, 1);
        newItems = orderAssessmentItems(newItems);

        this.$emit('update', newItems);

        if (this.openItemIdx === itemIdx) {
          this.closeOpenItem();
        } else if (this.openItemIdx > itemIdx) {
          this.openItem(this.openItemIdx - 1);
        }
      },
      swapItems(firstItemIdx, secondItemIdx) {
        let newItems = [...this.items];

        newItems = swapElements(newItems, firstItemIdx, secondItemIdx);
        newItems = orderAssessmentItems(newItems);

        this.$emit('update', newItems);

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
    },
    $trs: {
      incompleteItemIndicatorLabel: 'Incomplete',
      toolbarItemLabel: 'question',
      noQuestionsPlaceholder: 'No questions yet',
      closeBtnLabel: 'Close',
      newQuestionBtnLabel: 'New question',
      dialogTitle: 'Deleting question',
      dialogMessage: 'Are you sure you want to delete this question?',
      dialogSubmitBtnLabel: 'Delete',
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
      top: 10px;
      right: 10px;
    }

    &.closed {
      margin: 0 4px;
      cursor: pointer;
    }
  }

</style>
