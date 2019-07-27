<template>
  <div>
    <VLayout>
      <VFlex xs7 lg5>
        <VSelect
          :key="kindSelectKey"
          :items="kindSelectItems"
          :value="kind"
          label="Question type"
          data-test="kindSelect"
          @input="onKindUpdate"
        />
      </VFlex>
    </VLayout>

    <VLayout>
      <VFlex>
        <ErrorList
          :errors="questionErrors"
          data-test="questionErrors"
        />

        <div class="grey--text text--darken-2 mb-1">
          Question
        </div>

        <transition name="fade">
          <keep-alive include="MarkdownEditor">
            <MarkdownEditor
              v-if="isQuestionOpen"
              :markdown="question"
              @update="onQuestionUpdate"
            />

            <div
              v-else
              class="pl-2 pr-2 pt-3 pb-3 question-text"
              data-test="questionText"
              @click="openQuestion"
            >
              <VIcon color="grey darken-1">
                edit
              </VIcon>
              <span>{{ question }}</span>
            </div>
          </keep-alive>
        </transition>
      </VFlex>
    </VLayout>

    <VLayout mt-4>
      <VFlex>
        <ErrorList
          :errors="answersErrors"
          data-test="answersErrors"
        />

        <AnswersEditor
          :questionKind="kind"
          :answers="answers"
          :openAnswerIdx="openAnswerIdx"
          @update="onAnswersUpdate"
          @open="openAnswer"
          @close="closeAnswer"
        />

        <HintsEditor
          class="mt-4"
          :hints="hints"
          :openHintIdx="openHintIdx"
          @update="onHintsUpdate"
          @open="openHint"
          @close="closeHint"
        />
      </VFlex>
    </VLayout>
  </div>
</template>

<script>

  import { mapGetters, mapMutations } from 'vuex';

  import { AssessmentItemTypes, AssessmentItemTypeLabels } from '../../constants';
  import { getAssessmentItemErrorMessage, updateAnswersToQuestionKind } from '../../utils';

  import AnswersEditor from '../AnswersEditor/AnswersEditor.vue';
  import HintsEditor from '../HintsEditor/HintsEditor.vue';
  import ErrorList from '../ErrorList/ErrorList.vue';
  import MarkdownEditor from '../MarkdownEditor/MarkdownEditor.vue';

  export default {
    name: 'AssessmentItemEditor',
    components: {
      AnswersEditor,
      HintsEditor,
      ErrorList,
      MarkdownEditor,
    },
    props: {
      nodeId: {
        type: String,
      },
      itemIdx: {
        type: Number,
      },
    },
    data() {
      return {
        isQuestionOpen: false,
        openHintIdx: null,
        openAnswerIdx: null,
        kindSelectKey: 0,
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['nodeAssessmentDraft']),
      itemData() {
        if (
          this.nodeAssessmentDraft(this.nodeId) === null ||
          this.nodeAssessmentDraft(this.nodeId)[this.itemIdx] === undefined
        ) {
          return null;
        }

        return this.nodeAssessmentDraft(this.nodeId)[this.itemIdx].data;
      },
      itemValidation() {
        if (
          this.nodeAssessmentDraft(this.nodeId) === null ||
          this.nodeAssessmentDraft(this.nodeId)[this.itemIdx] === undefined
        ) {
          return null;
        }

        return this.nodeAssessmentDraft(this.nodeId)[this.itemIdx].validation;
      },
      question() {
        if (!this.itemData || !this.itemData.question) {
          return '';
        }

        return this.itemData.question;
      },
      kind() {
        if (!this.itemData || !this.itemData.type) {
          return AssessmentItemTypes.SINGLE_SELECTION;
        }

        return this.itemData.type;
      },
      kindSelectItems() {
        return [
          {
            value: AssessmentItemTypes.SINGLE_SELECTION,
            text: AssessmentItemTypeLabels[AssessmentItemTypes.SINGLE_SELECTION],
          },
          {
            value: AssessmentItemTypes.MULTIPLE_SELECTION,
            text: AssessmentItemTypeLabels[AssessmentItemTypes.MULTIPLE_SELECTION],
          },
          {
            value: AssessmentItemTypes.INPUT_QUESTION,
            text: AssessmentItemTypeLabels[AssessmentItemTypes.INPUT_QUESTION],
          },
          {
            value: AssessmentItemTypes.TRUE_FALSE,
            text: AssessmentItemTypeLabels[AssessmentItemTypes.TRUE_FALSE],
          },
        ];
      },
      answers() {
        if (!this.itemData || !this.itemData.answers) {
          return [];
        }

        return this.itemData.answers;
      },
      hints() {
        if (!this.itemData || !this.itemData.hints) {
          return [];
        }

        return this.itemData.hints;
      },
      questionErrors() {
        if (!this.itemValidation || !this.itemValidation.questionErrors) {
          return [];
        }

        return this.itemValidation.questionErrors.map(error =>
          getAssessmentItemErrorMessage(error, this.kind)
        );
      },
      answersErrors() {
        if (!this.itemValidation || !this.itemValidation.answersErrors) {
          return [];
        }

        return this.itemValidation.answersErrors.map(error =>
          getAssessmentItemErrorMessage(error, this.kind)
        );
      },
      hasMoreCorrectAnswers() {
        const correctAnswers = this.answers.filter(answer => answer.correct === true);

        return correctAnswers.length > 1;
      },
    },
    mounted() {
      if (!this.question) {
        this.openQuestion();
      }
    },
    methods: {
      ...mapMutations('edit_modal', [
        'updateNodeAssessmentDraftItemData',
        'sanitizeNodeAssessmentDraftItem',
        'validateNodeAssessmentDraftItem',
        'openDialog',
      ]),
      updateItem(data) {
        this.updateNodeAssessmentDraftItemData({
          nodeId: this.nodeId,
          assessmentItemIdx: this.itemIdx,
          data,
        });

        this.sanitizeNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          assessmentItemIdx: this.itemIdx,
        });

        this.validateNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          assessmentItemIdx: this.itemIdx,
        });
      },
      changeKind(newKind) {
        const newAnswers = updateAnswersToQuestionKind(newKind, this.answers);

        this.updateItem({ type: newKind, answers: newAnswers });
      },
      // question type VSelect needs to be rerended when confirmation dialog
      // cancelled to display a correct, previous, value that has changed
      // in the select but has not been changed in data storage actually
      // because of cancel action
      rerenderKindSelect() {
        this.kindSelectKey += 1;
      },
      onQuestionUpdate(newQuestion) {
        this.updateItem({ question: newQuestion });
      },
      onKindUpdate(newKind) {
        if (this.kind === newKind) {
          return;
        }

        switch (newKind) {
          case AssessmentItemTypes.SINGLE_SELECTION:
            if (this.hasMoreCorrectAnswers) {
              this.openDialog({
                title: 'Changing question type',
                message:
                  'Switching to single selection will set only one answer as correct. Continue?',
                submitLabel: 'Change',
                onSubmit: () => this.changeKind(newKind),
                onCancel: this.rerenderKindSelect,
              });
            } else {
              this.changeKind(newKind);
            }

            break;

          case AssessmentItemTypes.TRUE_FALSE:
            this.openDialog({
              title: 'Changing question type',
              message: 'Switching to true or false will remove any current answers. Continue?',
              submitLabel: 'Change',
              onSubmit: () => this.changeKind(newKind),
              onCancel: this.rerenderKindSelect,
            });
            break;

          case AssessmentItemTypes.INPUT_QUESTION:
            this.openDialog({
              title: 'Changing question type',
              message:
                'Switching to numeric input will set all answers as correct and remove all non-numeric answers. Continue?',
              submitLabel: 'Change',
              onSubmit: () => this.changeKind(newKind),
              onCancel: this.rerenderKindSelect,
            });
            break;

          default:
            this.changeKind(newKind);
            break;
        }
      },
      onAnswersUpdate(newAnswers) {
        this.updateItem({ answers: newAnswers });
      },
      onHintsUpdate(newHints) {
        this.updateItem({ hints: newHints });
      },
      openQuestion() {
        this.isQuestionOpen = true;

        this.closeAnswer();
        this.closeHint();
      },
      closeQuestion() {
        this.isQuestionOpen = false;
      },
      openHint(hintIdx) {
        this.openHintIdx = hintIdx;

        this.closeQuestion();
        this.closeAnswer();
      },
      closeHint() {
        this.openHintIdx = null;
      },
      openAnswer(answerIdx) {
        this.openAnswerIdx = answerIdx;

        this.closeQuestion();
        this.closeHint();
      },
      closeAnswer() {
        this.openAnswerIdx = null;
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../../less/global-variables.less';

  .question-text {
    transition: 0.7s;

    &:hover {
      cursor: pointer;
      background-color: @gray-light;
    }
  }

</style>
