<template>

  <div>
    <div class="grey--text mb-3 text--darken-1">
      {{ $tr('answersLabel') }}
    </div>
    <div>
      <div
        v-if="!answers || !answers.length"
        class="card-border-light pa-3"
      >
        {{ $tr('noAnswersPlaceholder') }}
      </div>
      <div
        v-for="(answer, answerIdx) in answers"
        :key="answerIdx"
        class="card-border-light"
        @click="onAnswerClick($event, answerIdx)"
      >
        <VCard
          :class="answerClasses(answerIdx)"
          flat
          data-test="answer"
        >
          <div :class="indicatorClasses(answer)"></div>
          <VCardText :class="{ 'pb-0': !isAnswerOpen(answerIdx) }">
            <VLayout align-top>
              <VFlex xs1>
                <!--
                  VRadio cannot be used without VRadioGroup like VCheckbox but it can
                  be solved by wrapping each VRadio to VRadioGroup
                  https://github.com/vuetifyjs/vuetify/issues/2345
                -->
                <VRadioGroup
                  v-if="shouldHaveOneCorrectAnswer"
                  :value="correctAnswersIndices"
                  @change="onCorrectAnswersIndicesUpdate"
                >
                  <VRadio
                    :value="answerIdx"
                    data-test="answerRadio"
                    color="primary"
                  />
                </VRadioGroup>

                <Checkbox
                  v-if="isMultipleSelection"
                  :key="answerIdx"
                  :value="answerIdx"
                  :inputValue="correctAnswersIndices"
                  @input="onCorrectAnswersIndicesUpdate"
                />
              </VFlex>


              <VFlex xs7>
                <keep-alive :max="5">
                  <!-- Input question shows a text field with type of `number` -->
                  <div v-if="isInputQuestion">
                    <VTextField
                      v-if="isAnswerOpen(answerIdx)"
                      v-model="answer.answer"
                      class="answer-number"
                      type="number"
                      :rules="[numericRule]"
                      @change="updateAnswerText($event, answerIdx)"
                    />
                    <VTextField v-else :value="answer.answer" class="no-border" type="number" />
                  </div>

                  <div v-else>
                    <MarkdownEditor
                      v-if="isAnswerOpen(answerIdx)"
                      class="editor"
                      analyticsLabel="Answer"
                      :markdown="answer.answer"
                      :handleFileUpload="handleFileUpload"
                      :getFileUpload="getFileUpload"
                      :imagePreset="imagePreset"
                      @update="updateAnswerText($event, answerIdx)"
                      @minimize="emitClose"
                    />
                    <MarkdownViewer
                      v-else
                      :markdown="answer.answer"
                    />
                  </div>
                </keep-alive>
              </VFlex>

              <VSpacer />

              <VFlex>
                <AssessmentItemToolbar
                  :iconActionsConfig="toolbarIconActions"
                  :canMoveUp="!isAnswerFirst(answerIdx)"
                  :canMoveDown="!isAnswerLast(answerIdx)"
                  class="toolbar"
                  analyticsLabel="Answer"
                  data-test="toolbar"
                  @click="onToolbarClick($event, answerIdx)"
                />
              </VFlex>
            </VLayout>
          </VCardText>
        </VCard>
      </div>
    </div>

    <VBtn
      v-if="isEditingAllowed"
      color="greyBackground"
      class="ml-0 mt-3"
      data-test="newAnswerBtn"
      @click="addNewAnswer"
    >
      {{ $tr('newAnswerBtnLabel') }}
    </VBtn>
  </div>

</template>

<script>

  import AssessmentItemToolbar from '../AssessmentItemToolbar';
  import { AssessmentItemToolbarActions } from '../../constants';
  import { floatOrIntRegex, getCorrectAnswersIndices, mapCorrectAnswers } from '../../utils';
  import { AssessmentItemTypes } from 'shared/constants';
  import { swapElements } from 'shared/utils/helpers';
  import Checkbox from 'shared/views/form/Checkbox';

  import MarkdownEditor from 'shared/views/MarkdownEditor/MarkdownEditor/MarkdownEditor';
  import MarkdownViewer from 'shared/views/MarkdownEditor/MarkdownViewer/MarkdownViewer';

  const updateAnswersOrder = answers => {
    return answers.map((answer, idx) => {
      return {
        ...answer,
        order: idx + 1,
      };
    });
  };

  export default {
    name: 'AnswersEditor',
    components: {
      AssessmentItemToolbar,
      MarkdownEditor,
      MarkdownViewer,
      Checkbox,
    },
    model: {
      prop: 'answers',
      event: 'update',
    },
    props: {
      questionKind: {
        type: String,
        validator: value => {
          return Object.values(AssessmentItemTypes).includes(value);
        },
        default: AssessmentItemTypes.SINGLE_SELECTION,
      },
      answers: {
        type: Array,
        default: () => [],
      },
      openAnswerIdx: {
        type: Number,
        default: 0,
      },
      // Inject function to handle file uploads
      handleFileUpload: {
        type: Function,
        default: () => {},
      },
      // Inject function to get file upload object
      getFileUpload: {
        type: Function,
        default: () => {},
      },
      imagePreset: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        correctAnswersIndices: getCorrectAnswersIndices(this.questionKind, this.answers),
        numericRule: val => floatOrIntRegex.test(val) || this.$tr('numberFieldErrorLabel'),
      };
    },
    computed: {
      isSingleSelection() {
        return this.questionKind === AssessmentItemTypes.SINGLE_SELECTION;
      },
      isMultipleSelection() {
        return this.questionKind === AssessmentItemTypes.MULTIPLE_SELECTION;
      },
      isTrueFalse() {
        return this.questionKind === AssessmentItemTypes.TRUE_FALSE;
      },
      isInputQuestion() {
        return this.questionKind === AssessmentItemTypes.INPUT_QUESTION;
      },
      shouldHaveOneCorrectAnswer() {
        return this.isSingleSelection || this.isTrueFalse;
      },
      isEditingAllowed() {
        return !this.isTrueFalse;
      },
      toolbarIconActions() {
        if (this.isSingleSelection || this.isMultipleSelection) {
          return [
            AssessmentItemToolbarActions.MOVE_ITEM_UP,
            AssessmentItemToolbarActions.MOVE_ITEM_DOWN,
            AssessmentItemToolbarActions.DELETE_ITEM,
          ];
        }

        if (this.isInputQuestion) {
          return [AssessmentItemToolbarActions.DELETE_ITEM];
        }

        return [];
      },
    },
    watch: {
      answers() {
        this.correctAnswersIndices = getCorrectAnswersIndices(this.questionKind, this.answers);
      },
    },
    methods: {
      isAnswerFirst(answerIdx) {
        return answerIdx === 0;
      },
      isAnswerLast(answerIdx) {
        return answerIdx === this.answers.length - 1;
      },
      isAnswerOpen(answerIdx) {
        return answerIdx === this.openAnswerIdx;
      },
      answerClasses(answerIdx) {
        const classes = ['answer'];

        if (this.isEditingAllowed) {
          classes.push('editable');
        }

        if (!this.isAnswerOpen(answerIdx)) {
          classes.push('closed');
        }

        if (this.answers[answerIdx].correct) {
          classes.push('answer-correct');
        } else {
          classes.push('answer-wrong');
        }

        return classes;
      },
      indicatorClasses(answer) {
        const classes = ['indicator'];

        if (answer.correct) {
          classes.push('correct');
        } else {
          classes.push('wrong');
        }

        return classes;
      },
      onCorrectAnswersIndicesUpdate(newIndices) {
        // indices can be an array or a single value - depends on question type
        if (this.correctAnswersIndices !== null) {
          if (this.shouldHaveOneCorrectAnswer && newIndices === this.correctAnswersIndices) {
            return;
          }

          if (
            !this.shouldHaveOneCorrectAnswer &&
            JSON.stringify([...newIndices].sort()) ===
              JSON.stringify([...this.correctAnswersIndices].sort())
          ) {
            return;
          }
        }

        const updatedAnswers = mapCorrectAnswers(this.answers, newIndices);

        this.emitUpdate(updatedAnswers);
      },
      emitOpen(answerIdx) {
        if (!this.isEditingAllowed) {
          return;
        }

        this.$emit('open', answerIdx);
      },
      emitClose() {
        this.$emit('close');
      },
      emitUpdate(updatedAnswers) {
        this.$emit('update', updatedAnswers);
      },
      moveAnswerUp(answerIdx) {
        if (this.isAnswerFirst(answerIdx)) {
          return;
        }

        let updatedAnswers = swapElements(this.answers, answerIdx, answerIdx - 1);
        updatedAnswers = updateAnswersOrder(updatedAnswers);

        this.emitUpdate(updatedAnswers);

        if (this.isAnswerOpen(answerIdx)) {
          this.emitOpen(answerIdx - 1);
        } else if (this.isAnswerOpen(answerIdx - 1)) {
          this.emitOpen(answerIdx);
        }
      },
      moveAnswerDown(answerIdx) {
        if (this.isAnswerLast(answerIdx)) {
          return;
        }

        let updatedAnswers = swapElements(this.answers, answerIdx, answerIdx + 1);
        updatedAnswers = updateAnswersOrder(updatedAnswers);

        this.emitUpdate(updatedAnswers);

        if (this.isAnswerOpen(answerIdx)) {
          this.emitOpen(answerIdx + 1);
        } else if (this.isAnswerOpen(answerIdx + 1)) {
          this.emitOpen(answerIdx);
        }
      },
      deleteAnswer(answerIdx) {
        let updatedAnswers = JSON.parse(JSON.stringify(this.answers));

        updatedAnswers.splice(answerIdx, 1);
        updatedAnswers = updateAnswersOrder(updatedAnswers);

        this.emitUpdate(updatedAnswers);

        if (this.isAnswerOpen(answerIdx)) {
          this.emitClose();
        } else if (this.openAnswerIdx > answerIdx) {
          this.emitOpen(this.openAnswerIdx - 1);
        }
      },
      onAnswerClick(event, answerIdx) {
        // do not open on toolbar click
        if (event.target.closest('.toolbar') !== null) {
          return;
        }

        // do not open on editor minimize button click
        if (event.target.classList.contains('tui-toolbar-btn-minimize')) {
          return;
        }

        // do not open on checkbox or radio click
        if (
          event.target.classList.contains('v-label') ||
          event.target.classList.contains('v-input--selection-controls__ripple')
        ) {
          return;
        }

        this.emitOpen(answerIdx);
        this.$analytics.trackAction('exercise_editor', 'Open', {
          eventLabel: 'Answer',
        });
      },
      onToolbarClick(action, answerIdx) {
        switch (action) {
          case AssessmentItemToolbarActions.MOVE_ITEM_UP:
            this.moveAnswerUp(answerIdx);
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_DOWN:
            this.moveAnswerDown(answerIdx);
            break;

          case AssessmentItemToolbarActions.DELETE_ITEM:
            this.deleteAnswer(answerIdx);
            break;
        }
      },
      updateAnswerText(newAnswerText, answerIdx) {
        const updatedAnswers = [...this.answers];
        updatedAnswers[answerIdx].answer = newAnswerText;

        this.emitUpdate(updatedAnswers);
      },
      addNewAnswer() {
        let updatedAnswers = this.answers || [];
        updatedAnswers = updateAnswersOrder(updatedAnswers);

        const defaultCorrectState = this.isInputQuestion ? true : false;
        updatedAnswers.push({
          answer: '',
          correct: defaultCorrectState,
          order: updatedAnswers.length + 1,
        });

        this.emitUpdate(updatedAnswers);
        this.emitOpen(updatedAnswers.length - 1);
        this.$analytics.trackAction('exercise_editor', 'Add', {
          eventLabel: 'Answer',
        });
      },
    },
    $trs: {
      answersLabel: 'Answers',
      noAnswersPlaceholder: 'Question has no answer options',
      newAnswerBtnLabel: 'New answer',
      numberFieldErrorLabel: 'Answer must be a number',
    },
  };

</script>

<style lang="less" scoped>

  @exercise-answer-correct: #4caf50;
  @exercise-answer-wrong: #ef5350;

  .card-border-light {
    /* stylelint-disable-next-line custom-property-pattern */
    border: 1px solid var(--v-greyBorder-lighten1);

    &:not(:first-child) {
      border-top: 0;
    }
  }

  .answer {
    position: relative;
    transition: 0.7s;

    &.closed.editable {
      cursor: pointer;
    }

    &.closed.answer-correct:hover {
      background-color: fade(@exercise-answer-correct, 15%);
    }

    &.closed.answer-wrong:hover {
      background-color: fade(@exercise-answer-wrong, 15%);
    }

    .indicator {
      position: absolute;
      width: 4px;
      height: 100%;

      &.correct {
        background-color: @exercise-answer-correct;
      }

      &.wrong {
        background-color: @exercise-answer-wrong;
      }
    }
  }

  .v-input--selection-controls {
    margin-top: 6px;
  }

  /* Remove the underline on text fields that are not focused */
  /deep/.no-border.v-text-field > .v-input__control > .v-input__slot::before,
  /deep/.no-border.v-text-field > .v-input__control > .v-input__slot::after {
    border-style: none;
  }

</style>
