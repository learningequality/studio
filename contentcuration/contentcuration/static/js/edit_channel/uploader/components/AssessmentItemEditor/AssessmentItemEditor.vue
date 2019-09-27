<template>
  <div>
    <VLayout>
      <VFlex xs7 lg5>
        <VSelect
          :key="kindSelectKey"
          :items="kindSelectItems"
          :value="kind"
          :label="$tr('questionTypeLabel')"
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
          {{ $tr('questionLabel') }}
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
              <VLayout align-center>
                <VIcon class="pr-2" color="grey darken-1">
                  edit
                </VIcon>
                <span class="title">{{ question }}</span>
              </VLayout>
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

  import { AssessmentItemTypes, AssessmentItemTypeLabels } from '../../constants';
  import { getAssessmentItemErrorMessage, updateAnswersToQuestionType } from '../../utils';

  import AnswersEditor from '../AnswersEditor/AnswersEditor.vue';
  import HintsEditor from '../HintsEditor/HintsEditor.vue';
  import MarkdownEditor from '../MarkdownEditor/MarkdownEditor.vue';
  import ErrorList from 'edit_channel/sharedComponents/ErrorList/ErrorList.vue';

  export default {
    name: 'AssessmentItemEditor',
    $trs: {
      questionTypeLabel: 'Question type',
      questionLabel: 'Question',
      dialogTitle: 'Changing question type',
      dialogSubmitBtnLabel: 'Change',
      dialogMessageChangeToSingleSelection:
        'Switching to single selection will set only one answer as correct. Continue?',
      dialogMessageChangeToTrueFalse:
        'Switching to true or false will remove any current answers. Continue?',
      dialogMessageChangeToInput:
        'Switching to numeric input will set all answers as correct and remove all non-numeric answers. Continue?',
    },
    components: {
      AnswersEditor,
      ErrorList,
      HintsEditor,
      MarkdownEditor,
    },
    model: {
      prop: 'item',
      event: 'update',
    },
    props: {
      /**
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
      item: {
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
        isQuestionOpen: false,
        openHintIdx: null,
        openAnswerIdx: null,
        kindSelectKey: 0,
      };
    },
    computed: {
      itemData() {
        if (!this.item) {
          return null;
        }

        return this.item.data;
      },
      itemValidation() {
        if (!this.item) {
          return null;
        }

        return this.item.validation;
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
      updateItem(data) {
        let newItem = {
          ...this.item,
          data: {
            ...this.item.data,
            ...data,
          },
        };

        this.$emit('update', newItem);
      },
      changeKind(newKind) {
        const newAnswers = updateAnswersToQuestionType(newKind, this.answers);

        this.closeAnswer();
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
            if (typeof this.openDialog === 'function' && this.hasMoreCorrectAnswers) {
              this.openDialog({
                title: this.$tr('dialogTitle'),
                message: this.$tr('dialogMessageChangeToSingleSelection'),
                submitLabel: this.$tr('dialogSubmitBtnLabel'),
                onSubmit: () => this.changeKind(newKind),
                onCancel: this.rerenderKindSelect,
              });
            } else {
              this.changeKind(newKind);
            }

            break;

          case AssessmentItemTypes.TRUE_FALSE:
            if (typeof this.openDialog === 'function' && this.answers.length > 0) {
              this.openDialog({
                title: this.$tr('dialogTitle'),
                message: this.$tr('dialogMessageChangeToTrueFalse'),
                submitLabel: this.$tr('dialogSubmitBtnLabel'),
                onSubmit: () => this.changeKind(newKind),
                onCancel: this.rerenderKindSelect,
              });
            } else {
              this.changeKind(newKind);
            }

            break;

          case AssessmentItemTypes.INPUT_QUESTION:
            if (typeof this.openDialog === 'function' && this.answers.length > 0) {
              this.openDialog({
                title: this.$tr('dialogTitle'),
                message: this.$tr('dialogMessageChangeToInput'),
                submitLabel: this.$tr('dialogSubmitBtnLabel'),
                onSubmit: () => this.changeKind(newKind),
                onCancel: this.rerenderKindSelect,
              });
            } else {
              this.changeKind(newKind);
            }

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
