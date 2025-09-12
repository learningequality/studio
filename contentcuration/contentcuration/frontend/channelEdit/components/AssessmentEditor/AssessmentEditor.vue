<template>

  <VContainer fluid>
    <template v-if="sortedItems && sortedItems.length">
      <Checkbox
        v-model="displayAnswersPreview"
        :label="$tr('showAnswers')"
        class="mb-4"
        data-test="showAnswersCheckbox"
        style="font-size: 16px"
      />

      <transition-group
        name="list-complete"
        tag="div"
      >
        <VCard
          v-for="(item, idx) in sortedItems"
          ref="questionCardRef"
          :key="`question-${item.assessment_id}`"
          pa-1
          class="elevation-4 list-complete-item"
          :class="itemClasses(item)"
          data-test="item"
          @click="onItemClick($event, item)"
        >
          <VCardText>
            <VLayout align-start>
              <VFlex
                :style="{ 'margin-right': '1.5rem' }"
                shrink
                mt-2
              >
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
                xs11
              >
                <AssessmentItemEditor
                  :item="item"
                  :errors="itemErrors(item)"
                  :openDialog="openDialog"
                  :nodeId="nodeId"
                  data-test="editor"
                  @update="onItemUpdate"
                  @close="closeActiveItem"
                />
              </VFlex>

              <VSpacer />

              <VLayout
                align-center
                class="toolbar"
              >
                <VFlex
                  v-if="!isItemActive(item) && !isItemValid(item)"
                  mr-2
                >
                  <template v-if="$vuetify.breakpoint.lgAndUp">
                    <Icon icon="error" />
                    <span class="font-weight-bold red--text">
                      {{ $tr('incompleteItemIndicatorLabel') }}
                    </span>
                  </template>
                  <template v-else>
                    <Icon
                      ref="incompleteError"
                      icon="error"
                    />
                    <KTooltip
                      reference="incompleteError"
                      placement="bottom"
                      :refs="$refs"
                    >
                      {{ $tr('incompleteItemIndicatorLabel') }}
                    </KTooltip>
                  </template>
                </VFlex>

                <VFlex>
                  <AssessmentItemToolbar
                    :iconActionsConfig="itemToolbarIconActions(item)"
                    :displayMenu="true"
                    :menuActionsConfig="itemToolbarMenuActions"
                    :canEdit="!isPerseusItem(item)"
                    :canMoveUp="!isItemFirst(item)"
                    :canMoveDown="!isItemLast(item)"
                    :collapse="!$vuetify.breakpoint.mdAndUp"
                    :itemLabel="$tr('toolbarItemLabel')"
                    analyticsLabel="Question"
                    @click="onItemToolbarClick($event, item)"
                  />
                </VFlex>
              </VLayout>
            </VLayout>

            <VLayout
              v-if="isItemActive(item)"
              justify-end
            >
              <KButton
                :text="$tr('closeBtnLabel')"
                class="close-item-btn"
                data-test="closeBtn"
                @click="closeActiveItem"
              />
            </VLayout>
          </VCardText>
        </VCard>
      </transition-group>
    </template>

    <div v-else>
      {{ $tr('noQuestionsPlaceholder') }}
    </div>

    <KButton
      :text="$tr('newQuestionBtnLabel')"
      class="ml-0 mt-4"
      data-test="newQuestionBtn"
      @click="addItem"
    />
  </VContainer>

</template>


<script>

  import { AssessmentItemToolbarActions } from '../../constants';
  import { assessmentItemKey } from '../../utils';

  import AssessmentItemToolbar from '../AssessmentItemToolbar';
  import AssessmentItemEditor from '../AssessmentItemEditor/AssessmentItemEditor';
  import AssessmentItemPreview from '../AssessmentItemPreview/AssessmentItemPreview';
  import Checkbox from 'shared/views/form/Checkbox';
  import { AssessmentItemTypes, DELAYED_VALIDATION } from 'shared/constants';

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
      Checkbox,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      items: {
        type: Array,
        default: () => [],
      },
      itemsErrors: {
        type: Object,
        default: null,
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
        default: () => {},
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
        if (!this.isPerseusItem(item)) {
          this.closeActiveItem();
          this.activeItem = item;
        }
      },
      closeActiveItem() {
        if (this.activeItem === null) {
          return;
        }
        this.$emit('updateItem', {
          ...assessmentItemKey(this.activeItem),
          [DELAYED_VALIDATION]: false,
        });
        this.activeItem = null;
      },
      isItemActive(item) {
        return areItemsEqual(this.activeItem, item);
      },
      isPerseusItem(item) {
        return item && item.type === AssessmentItemTypes.PERSEUS_QUESTION;
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
      async addItem({ before, after }) {
        let newItemOrder;
        if (before) {
          newItemOrder = this.itemIdx(before);
        } else if (after) {
          newItemOrder = this.itemIdx(after) + 1;
        } else {
          newItemOrder = this.items.length;
        }
        const newItem = {
          contentnode: this.nodeId,
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [],
          hints: [],
          order: newItemOrder,
          [DELAYED_VALIDATION]: true,
        };

        const reorderedItems = [...this.sortedItems];
        reorderedItems.splice(newItem.order, 0, newItem);

        const newOrders = this.items.map(item => ({
          ...assessmentItemKey(item),
          order: reorderedItems.indexOf(item),
        }));

        // ensure state updates are finished before opening the new item
        await this.$listeners.updateItems(newOrders);
        await this.$listeners.addItem(newItem);

        this.openItem(newItem);
        this.$analytics.trackAction('exercise_editor', 'Add', {
          eventLabel: 'Question',
        });
        this.$nextTick(() => {
          const questionCards = this.$refs['questionCardRef'];
          if (questionCards?.length >= 1) {
            const lastQuestionCard = questionCards[questionCards.length - 1].$el;
            const editorDiv = document.getElementById('editViewId');
            if (!editorDiv) {
              return;
            }
            editorDiv.scrollTo({
              top: lastQuestionCard.offsetTop,
              behavior: 'smooth',
            });
          }
        });
      },
      async deleteItem(itemToDelete) {
        if (this.isItemActive(itemToDelete)) {
          this.closeActiveItem();
        }

        const newOrders = this.items
          .filter(item => item.assessment_id != itemToDelete.assessment_id)
          .map(item => ({
            ...assessmentItemKey(item),
            order: item.order > itemToDelete.order ? item.order - 1 : item.order,
          }));

        // make sure order update happens first for slightly smoother animation
        await this.$listeners.updateItems(newOrders);
        this.$emit('deleteItem', itemToDelete);
      },
      swapItems(firstItem, secondItem) {
        this.$emit('updateItems', [
          {
            ...assessmentItemKey(firstItem),
            order: this.itemIdx(secondItem),
          },
          {
            ...assessmentItemKey(secondItem),
            order: this.itemIdx(firstItem),
          },
        ]);
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
        this.$analytics.trackAction('exercise_editor', 'Open', {
          eventLabel: 'Question',
        });
      },
      onItemToolbarClick(action, item) {
        switch (action) {
          case AssessmentItemToolbarActions.EDIT_ITEM:
            this.openItem(item);
            break;

          case AssessmentItemToolbarActions.DELETE_ITEM:
            this.deleteItem(item);
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
      noQuestionsPlaceholder: 'Exercise has no questions',
      closeBtnLabel: 'Close',
      newQuestionBtnLabel: 'New question',
      showAnswers: 'Show answers',
    },
  };

</script>


<style lang="scss" scoped>

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
