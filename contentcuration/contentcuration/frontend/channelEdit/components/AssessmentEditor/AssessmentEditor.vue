<template>

  <div>
    <template v-if="sortedItems && sortedItems.length">
      <VCheckbox
        v-model="displayAnswersPreview"
        label="Show answers"
        class="mt-4 ml-0"
        data-test="showAnswersCheckbox"
      />

      <VCard
        v-for="(item, idx) in sortedItems"
        :key="idx"
        pa-1
        :class="itemClasses(item)"
        data-test="item"
        @click="onItemClick($event, item)"
      >
        <VCardText>
          <VLayout align-start>
            <VFlex xs1 mt-2>
              {{ idx + 1 }}
            </VFlex>

            <VFlex
              v-if="!isItemActive(item)"
              xs10
            >
              <AssessmentItemPreview
                :item="item"
                :detailed="displayAnswersPreview"
              />
            </VFlex>

            <VFlex
              v-else
              xs10
            >
              <AssessmentItemEditor
                :item="item"
                :errors="itemErrors(item)"
                :openDialog="openDialog"
                data-test="editor"
                @update="onItemUpdate"
                @close="closeActiveItem"
              />
            </VFlex>

            <VSpacer />

            <VLayout align-center class="toolbar">
              <VFlex
                v-if="!isItemActive(item) && !isItemValid(item)"
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
                  :iconActionsConfig="itemToolbarIconActions(item)"
                  :displayMenu="true"
                  :menuActionsConfig="itemToolbarMenuActions"
                  :canMoveUp="!isItemFirst(item)"
                  :canMoveDown="!isItemLast(item)"
                  :collapse="!$vuetify.breakpoint.mdAndUp"
                  :itemLabel="$tr('toolbarItemLabel')"
                  @click="onItemToolbarClick($event, item)"
                />
              </VFlex>
            </VLayout>
          </VLayout>

          <VLayout v-if="isItemActive(item)" justify-end>
            <VBtn
              flat
              class="close-item-btn mr-0"
              data-test="closeBtn"
              @click="closeActiveItem"
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
      @click="addItem"
    >
      {{ $tr('newQuestionBtnLabel') }}
    </VBtn>
  </div>

</template>

<script>

  import { AssessmentItemTypes, AssessmentItemToolbarActions } from '../../constants';

  import AssessmentItemToolbar from '../AssessmentItemToolbar';
  import AssessmentItemEditor from '../AssessmentItemEditor/AssessmentItemEditor';
  import AssessmentItemPreview from '../AssessmentItemPreview/AssessmentItemPreview';

  function areItemsEqual(item1, item2) {
    if (!item1 || !item2) {
      return false;
    }
    if (item1.assessment_id !== undefined && item2.assessment_id !== undefined) {
      return item1.assessment_id === item2.assessment_id;
    }
    return item1.order === item2.order;
  }

  export default {
    name: 'AssessmentEditor',
    components: {
      AssessmentItemToolbar,
      AssessmentItemEditor,
      AssessmentItemPreview,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      items: {
        type: Array,
      },
      itemsErrors: {
        type: Object,
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
        activeItem: null,
        displayAnswersPreview: false,
        itemToolbarMenuActions: [
          AssessmentItemToolbarActions.ADD_ITEM_ABOVE,
          AssessmentItemToolbarActions.ADD_ITEM_BELOW,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
      };
    },
    computed: {
      sortedItems() {
        if (!this.items) {
          return [];
        }

        return [...this.items].sort((item1, item2) => (item1.order > item2.order ? 1 : -1));
      },
      firstItem() {
        return this.sortedItems.length ? this.sortedItems[0] : null;
      },
      lastItem() {
        return this.sortedItems.length ? this.sortedItems[this.sortedItems.length - 1] : null;
      },
    },
    watch: {
      items(newItems) {
        if (!newItems) {
          return;
        }
        const updatedActiveItem = newItems.find(item => areItemsEqual(item, this.activeItem));
        if (updatedActiveItem) {
          this.activeItem = updatedActiveItem;
        }
      },
    },
    methods: {
      /**
       * @public
       */
      reset() {
        this.closeActiveItem();
        this.displayAnswersPreview = false;
      },
      itemIdx(item) {
        return this.sortedItems.findIndex(i => areItemsEqual(i, item));
      },
      openItem(item) {
        this.closeActiveItem();
        this.activeItem = item;
      },
      closeActiveItem() {
        if (this.activeItem === null) {
          return;
        }
        this.$emit('updateItem', {
          ...this.activeItem,
          isNew: false,
        });
        this.activeItem = null;
      },
      isItemActive(item) {
        return areItemsEqual(this.activeItem, item);
      },
      isItemFirst(item) {
        return areItemsEqual(this.firstItem, item);
      },
      isItemLast(item) {
        return areItemsEqual(this.lastItem, item);
      },
      itemErrors(item) {
        if (!this.itemsErrors || !this.itemsErrors[item.assessment_id]) {
          return [];
        }
        return this.itemsErrors[item.assessment_id];
      },
      isItemValid(item) {
        return this.itemErrors(item).length === 0;
      },
      itemClasses(item) {
        const classes = ['item'];

        if (!this.isItemActive(item)) {
          classes.push('closed');
        }

        return classes;
      },
      itemToolbarIconActions(item) {
        const actions = [
          [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
          [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
        ];

        if (!this.isItemActive(item)) {
          actions.unshift([AssessmentItemToolbarActions.EDIT_ITEM, { collapse: false }]);
        }

        return actions;
      },
      onItemUpdate(item) {
        this.$emit('updateItem', item);
      },
      /**
       * @param {Object} before A new item should be added before this item.
       * @param {Object} after A new item should be added after this item.
       */
      addItem({ before, after }) {
        let order = this.items.length;
        if (before) {
          order = Math.max(0, before.order);
        }
        if (after) {
          order = Math.min(this.items.length, after.order + 1);
        }

        const newItem = {
          contentnode: this.nodeId,
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [],
          hints: [],
          order,
          isNew: true,
        };

        this.$emit('addItem', newItem);
        this.openItem(newItem);

        this.items.forEach(item => {
          if ((before && item.order >= before.order) || (after && item.order > after.order)) {
            this.$emit('updateItem', {
              ...item,
              order: item.order + 1,
            });
          }
        });
      },
      deleteItem(itemToDelete) {
        let itemToOpen = null;
        this.items.forEach(item => {
          if (item.order > itemToDelete.order) {
            const updatedItem = {
              ...item,
              order: item.order - 1,
            };
            this.$emit('updateItem', updatedItem);

            if (this.activeItem && this.activeItem.order - 1 === updatedItem.order) {
              itemToOpen = updatedItem;
            }
          }
        });

        if (this.isItemActive(itemToDelete)) {
          this.closeActiveItem();
        }
        this.$emit('deleteItem', itemToDelete);

        if (this.itemToOpen) {
          this.openItem(itemToOpen);
        }
      },
      swapItems(firstItem, secondItem) {
        const firstUpdatedItem = {
          ...firstItem,
          order: secondItem.order,
        };
        const secondUpdatedItem = {
          ...secondItem,
          order: firstItem.order,
        };

        let itemToOpen = null;
        if (this.isItemActive(firstItem)) {
          itemToOpen = firstUpdatedItem;
        }
        if (this.isItemActive(secondItem)) {
          itemToOpen = secondUpdatedItem;
        }

        this.$emit('updateItem', firstUpdatedItem);
        this.$emit('updateItem', secondUpdatedItem);

        if (this.itemToOpen !== null) {
          this.openItem(itemToOpen);
        }
      },
      moveItemUp(item) {
        if (this.isItemFirst(item)) {
          return;
        }

        const previousItem = this.sortedItems[this.itemIdx(item) - 1];
        this.swapItems(item, previousItem);
      },
      moveItemDown(item) {
        if (this.isItemLast(item)) {
          return;
        }

        const nextItem = this.sortedItems[this.itemIdx(item) + 1];
        this.swapItems(item, nextItem);
      },
      onItemClick(event, item) {
        if (this.isItemActive(item)) {
          return;
        }

        if (
          event.target.closest('.close-item-btn') !== null ||
          event.target.closest('.toolbar') !== null ||
          event.target.closest('.hints-preview') !== null
        ) {
          return;
        }

        this.openItem(item);
      },
      onItemToolbarClick(action, item) {
        switch (action) {
          case AssessmentItemToolbarActions.EDIT_ITEM:
            this.openItem(item);
            break;

          case AssessmentItemToolbarActions.DELETE_ITEM:
            if (typeof this.openDialog === 'function') {
              this.openDialog({
                title: this.$tr('dialogTitle'),
                message: this.$tr('dialogMessage'),
                submitLabel: this.$tr('dialogSubmitBtnLabel'),
                onSubmit: () => this.deleteItem(item),
                onCancel: this.rerenderKindSelect,
              });
            } else {
              this.deleteItem(item);
            }

            break;

          case AssessmentItemToolbarActions.ADD_ITEM_ABOVE:
            this.addItem({ before: item });
            break;

          case AssessmentItemToolbarActions.ADD_ITEM_BELOW:
            this.addItem({ after: item });
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_UP:
            this.moveItemUp(item);
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_DOWN:
            this.moveItemDown(item);
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
