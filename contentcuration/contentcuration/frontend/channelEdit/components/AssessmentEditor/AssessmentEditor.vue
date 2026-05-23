<template>

  <VContainer
    fluid
    :style="containerStyle"
  >
    <template v-if="sortedItems && sortedItems.length">
      <KPageContainer
        class="show-answers-container"
        :topMargin="0"
        noPadding
      >
        <div class="show-answers-inner">
          <Checkbox
            v-model="displayAnswersPreview"
            :label="$tr('showAnswers')"
            class="ma-0"
            data-test="showAnswersCheckbox"
            style="font-size: 16px"
          />
        </div>
      </KPageContainer>

      <transition-group
        name="list-complete"
        tag="div"
      >
        <KPageContainer
          v-for="(item, idx) in sortedItems"
          :key="itemCardKey(item)"
          ref="questionCardRef"
          noPadding
          :topMargin="0"
          class="question-card"
          :class="itemClasses(item)"
          data-test="item"
          @click.native="onItemClick($event, item)"
        >
          <div
            class="question-card-header"
            :style="{ borderBottom: `1px solid ${$themePalette.grey.v_200}` }"
          >
            <h3
              class="question-card-title"
              :style="{ color: $themePalette.grey.v_800 }"
            >
              <template v-if="isItemActive(item)">
                {{ questionNumberLabel(idx) }}
              </template>
              <template v-else>
                {{ questionNumberAndTypeLabel(item, idx) }}
              </template>
            </h3>

            <div class="question-card-actions toolbar">
              <div v-if="!isItemValid(item)">
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
              </div>

              <AssessmentItemToolbar
                :iconActionsConfig="itemToolbarIconActions()"
                :displayMenu="true"
                :menuActionsConfig="itemToolbarMenuActions()"
                :canMoveUp="!isItemFirst(item)"
                :canMoveDown="!isItemLast(item)"
                :collapse="!$vuetify.breakpoint.mdAndUp"
                :itemLabel="$tr('toolbarItemLabel')"
                analyticsLabel="Question"
                @click="onItemToolbarClick($event, item)"
              />
            </div>
          </div>

          <div class="question-card-body">
            <AssessmentItemEditor
              v-if="isItemActive(item)"
              :item="item"
              :errors="itemErrors(item)"
              :openDialog="openDialog"
              :nodeId="nodeId"
              data-test="editor"
              @update="onItemUpdate"
              @close="closeActiveItem"
            />
            <AssessmentItemPreview
              v-else
              :item="item"
              :detailed="displayAnswersPreview"
              :showTypeLabel="false"
            />
          </div>

          <div
            v-if="isItemActive(item)"
            class="question-card-footer"
          >
            <KButton
              :text="$tr('closeBtnLabel')"
              class="close-item-btn"
              data-test="closeBtn"
              @click="closeActiveItem"
            />
          </div>
        </KPageContainer>
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

  import { AssessmentItemToolbarActions, AssessmentItemTypeLabels } from '../../constants';
  import { assessmentItemKey } from '../../utils';
  import translator from '../../translator';

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
      windowIsSmall: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        activeItem: null,
        displayAnswersPreview: false,
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
      containerStyle() {
        return this.windowIsSmall ? {} : { maxWidth: '85%', margin: '0 auto' };
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
      questionNumberLabel(idx) {
        return this.$tr('questionNumberLabel', {
          number: idx + 1,
          total: this.sortedItems.length,
        });
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
      itemCardKey(item) {
        return `question-card-${item.assessment_id}`;
      },
      questionNumberAndTypeLabel(item, idx) {
        const kind = item?.type || '';
        const kindLabel =
          kind && AssessmentItemTypeLabels[kind]
            ? translator.$tr(AssessmentItemTypeLabels[kind])
            : '';
        return this.$tr('questionNumberAndTypeLabel', {
          number: idx + 1,
          total: this.sortedItems.length,
          type: kindLabel,
        });
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
      itemToolbarIconActions() {
        return [
          [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
          [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
        ];
      },
      itemToolbarMenuActions() {
        return [
          AssessmentItemToolbarActions.ADD_ITEM_ABOVE,
          AssessmentItemToolbarActions.ADD_ITEM_BELOW,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ];
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
      questionNumberLabel: 'Question {number} of {total}',
      questionNumberAndTypeLabel: 'Question {number} of {total} — {type}',
    },
  };

</script>


<style lang="scss" scoped>

  .show-answers-container,
  .question-card {
    margin-bottom: 16px;
  }

  .show-answers-inner {
    display: flex;
    align-items: center;
    padding: 12px;
  }

  .question-card {
    --question-card-horizontal-padding: 20px;

    position: relative;
    min-height: 75px;
    padding: 0;

    &.closed {
      cursor: pointer;
    }
  }

  .question-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px var(--question-card-horizontal-padding);
  }

  .question-card-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .question-card-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .question-card-body {
    min-width: 0;
    padding: 10px var(--question-card-horizontal-padding);
  }

  .question-card-footer {
    display: flex;
    justify-content: flex-end;
    padding: 0 var(--question-card-horizontal-padding) 20px;
  }

</style>
