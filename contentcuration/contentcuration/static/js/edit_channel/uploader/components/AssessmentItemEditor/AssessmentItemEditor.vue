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
          :errors="questionErrorMessages"
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
          :errors="answersErrorMessages"
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

  import { AssessmentItemTypes, AssessmentItemTypeLabels, ValidationErrors } from '../../constants';
  import { updateAnswersToQuestionType } from '../../utils';
  import translator from '../../translator';

  import AnswersEditor from '../AnswersEditor/AnswersEditor.vue';
  import HintsEditor from '../HintsEditor/HintsEditor.vue';
  import MarkdownEditor from '../MarkdownEditor/MarkdownEditor.vue';
  import ErrorList from 'edit_channel/sharedComponents/ErrorList/ErrorList.vue';

  export default {
    name: 'AssessmentItemEditor',
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
       * An assessment item as retrieved from API:
       * {
       *    question
       *    type
       *    order
       *    answers
       *    hints
       *    ...
       * }
       */
      item: {
        type: Object,
      },
      /**
       * An array of error codes related to the item.
       */
      errors: {
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
        isQuestionOpen: false,
        openHintIdx: null,
        openAnswerIdx: null,
        kindSelectKey: 0,
      };
    },
    computed: {
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
      questionErrorMessages() {
        const errorMessages = [];

        if (this.errors && this.errors.includes(ValidationErrors.QUESTION_REQUIRED)) {
          errorMessages.push(translator.translate('errorQuestionRequired'));
        }

        return errorMessages;
      },
      answersErrorMessages() {
        if (
          !this.errors ||
          !this.errors.includes(ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS)
        ) {
          return [];
        }

        const errorMessages = [];

        switch (this.kind) {
          case AssessmentItemTypes.SINGLE_SELECTION:
          case AssessmentItemTypes.TRUE_FALSE:
            errorMessages.push(translator.translate('errorMissingAnswer'));
            break;

          case AssessmentItemTypes.MULTIPLE_SELECTION:
            errorMessages.push(translator.translate('errorChooseAtLeastOneCorrectAnswer'));
            break;

          case AssessmentItemTypes.INPUT_QUESTION:
            errorMessages.push(translator.translate('errorProvideAtLeastOneCorrectAnwer'));
            break;
        }

        return errorMessages;
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
      updateItem(payload) {
        let newItem = {
          ...this.item,
          ...payload,
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
