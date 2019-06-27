<template>
  <VCard>
    <VCardTitle
      v-if="!isOpen"
      :style="{ 'cursor': 'pointer' }"
      @click="onClosedQuestionClick"
    >
      <VContainer fluid>
        <VLayout row>
          <VFlex xs1>
            {{ order }}
          </VFlex>

          <VFlex>
            <div class="caption grey--text mb-1">
              {{ kindLabel }}
            </div>
            <div data-test="questionText">
              {{ question }}
            </div>
          </VFlex>

          <VSpacer />
          <AssessmentItemToolbar
            :canMoveUp="!isFirst"
            :canMoveDown="!isLast"
            class="toolbar"
            @click="onToolbarClick"
          />
        </VLayout>

        <template v-if="displayAnswersPreview">
          <!-- eslint-disable-next-line -->
          <VLayout row mt-3 justify-end>
            <VFlex xs11>
              <div class="caption grey--text mb-1">
                Answers
              </div>

              <AnswersPreview
                :questionKind="kind"
                :answers="answers"
              />
            </VFlex>
          </VLayout>
        </template>
      </VContainer>
    </VCardTitle>

    <template v-else>
      <VCardTitle data-test="open">
        <VContainer fluid>
          <VLayout row>
            <VFlex xs1>
              {{ order }}
            </VFlex>

            <VFlex xs5>
              <VSelect
                :items="kindSelectItems"
                :value="kind"
                label="Question type"
                data-test="kindSelect"
                @input="onKindChange"
              />
            </VFlex>

            <VSpacer />
            <AssessmentItemToolbar
              :displayEdit="false"
              :canMoveUp="!isFirst"
              :canMoveDown="!isLast"
              class="toolbar"
              @click="onToolbarClick"
            />
          </VLayout>

          <!-- eslint-disable-next-line -->
          <VLayout row justify-end>
            <VFlex xs11>
              <VTextField
                label="Question text"
                :value="question"
                data-test="questionInput"
                @input="onQuestionChange"
              />
            </VFlex>
          </VLayout>
        </VContainer>
      </VCardTitle>

      <VCardText>
        <VContainer fluid>
          <!-- eslint-disable-next-line -->
          <VLayout row justify-end>
            <VFlex xs11>
              <AnswersEditor
                :questionKind="kind"
                :answers="answers"
                @update="onAnswersChange"
              />

              <VDivider class="mt-3 mb-3" />

              <HintsEditor
                :hints="hints"
                @update="onHintsChange"
              />
            </VFlex>
          </VLayout>

          <!-- eslint-disable-next-line -->
          <VLayout row justify-end>
            <VBtn
              flat
              color="primary"
              data-test="closeBtn"
              @click="onCloseClick"
            >
              Close
            </VBtn>
          </VLayout>
        </VContainer>
      </VCardText>
    </template>
  </VCard>
</template>

<script>

  import { mapGetters, mapMutations } from 'vuex';

  import { AssessmentItemTypes, AssessmentItemToolbarActions } from '../../constants';
  import { updateAnswersToQuestionKind } from '../../utils';

  import AnswersEditor from '../AnswersEditor/AnswersEditor.vue';
  import AnswersPreview from '../AnswersPreview/AnswersPreview.vue';
  import AssessmentItemToolbar from '../AssessmentItemToolbar/AssessmentItemToolbar.vue';
  import HintsEditor from '../HintsEditor/HintsEditor.vue';

  export default {
    name: 'AssessmentItem',
    components: {
      AnswersEditor,
      AnswersPreview,
      AssessmentItemToolbar,
      HintsEditor,
    },
    props: {
      nodeId: {
        type: String,
      },
      itemIdx: {
        type: Number,
      },
      isOpen: {
        type: Boolean,
        default: false,
      },
      displayAnswersPreview: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('edit_modal', ['nodeAssessmentDraft']),
      item() {
        return this.nodeAssessmentDraft(this.nodeId)[this.itemIdx];
      },
      order() {
        if (!this.item || this.item.order === undefined) {
          return 1;
        }

        return this.item.order + 1;
      },
      question() {
        if (!this.item || !this.item.question) {
          return '';
        }

        return this.item.question;
      },
      kind() {
        if (!this.item || !this.item.type) {
          return AssessmentItemTypes.SINGLE_SELECTION;
        }

        return this.item.type;
      },
      kindSelectItems() {
        return [
          { value: AssessmentItemTypes.SINGLE_SELECTION, text: 'Single selection' },
          { value: AssessmentItemTypes.MULTIPLE_SELECTION, text: 'Multiple selection' },
          { value: AssessmentItemTypes.INPUT_QUESTION, text: 'Input question' },
          { value: AssessmentItemTypes.TRUE_FALSE, text: 'True/False' },
        ];
      },
      kindLabel() {
        return this.kindSelectItems.find(item => item.value === this.kind).text;
      },
      answers() {
        if (!this.item || !this.item.answers) {
          return [];
        }

        return this.item.answers;
      },
      hints() {
        if (!this.item || !this.item.hints) {
          return [];
        }

        return this.item.hints;
      },
      isFirst() {
        return this.itemIdx === 0;
      },
      isLast() {
        return this.itemIdx === this.nodeAssessmentDraft(this.nodeId).length - 1;
      },
    },
    methods: {
      ...mapMutations('edit_modal', [
        'addNodeAssessmentDraftItem',
        'updateNodeAssessmentDraftItem',
        'deleteNodeAssessmentDraftItem',
        'swapNodeAssessmentDraftItems',
      ]),
      updateItem(data) {
        this.updateNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          assessmentItemIdx: this.itemIdx,
          data,
        });
      },
      deleteItem() {
        // TODO @MisRob: display warning and continue only when confirmed
        this.deleteNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          assessmentItemIdx: this.itemIdx,
        });
      },
      addItemAbove() {
        this.addNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          before: this.itemIdx,
        });

        this.$emit('newItemAdded', this.itemIdx);
      },
      addItemBelow() {
        this.addNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          after: this.itemIdx,
        });

        this.$emit('newItemAdded', this.itemIdx + 1);
      },
      moveItemUp() {
        if (this.isFirst) {
          return;
        }

        this.swapWithItem(this.itemIdx - 1);
      },
      moveItemDown() {
        if (this.isLast) {
          return;
        }

        this.swapWithItem(this.itemIdx + 1);
      },
      swapWithItem(itemIdx) {
        const firstItemIdx = this.itemIdx;
        const secondItemIdx = itemIdx;

        this.swapNodeAssessmentDraftItems({
          nodeId: this.nodeId,
          firstItemIdx,
          secondItemIdx,
        });

        this.$emit('itemsSwapped', { firstItemIdx, secondItemIdx });
      },
      onQuestionChange(newQuestion) {
        this.updateItem({ question: newQuestion });
      },
      onKindChange(newKind) {
        if (this.kind === newKind) {
          return;
        }

        if (newKind === AssessmentItemTypes.TRUE_FALSE) {
          // TODO @MisRob: display warning that all answers
          // will be lost and continue only when confirmed
        }
        const newAnswers = updateAnswersToQuestionKind(newKind, this.answers);

        this.updateItem({ type: newKind, answers: newAnswers });
      },
      onAnswersChange(newAnswers) {
        this.updateItem({ answers: newAnswers });
      },
      onHintsChange(newHints) {
        this.updateItem({ hints: newHints });
      },
      onCloseClick() {
        this.$emit('close');
      },
      onClosedQuestionClick(event) {
        // ignore toolbar click in this case (click on edit
        // icon is processed in toolbar click handler)
        if (event.target.closest('.toolbar') !== null) {
          return;
        }

        this.$emit('open');
      },
      onToolbarClick(action) {
        switch (action) {
          case AssessmentItemToolbarActions.EDIT_ITEM:
            this.$emit('open');
            break;

          case AssessmentItemToolbarActions.DELETE_ITEM:
            this.deleteItem();
            break;

          case AssessmentItemToolbarActions.ADD_ITEM_ABOVE:
            this.addItemAbove();
            break;

          case AssessmentItemToolbarActions.ADD_ITEM_BELOW:
            this.addItemBelow();
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_UP:
            this.moveItemUp();
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_DOWN:
            this.moveItemDown();
            break;
        }
      },
    },
  };

</script>
