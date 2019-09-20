<template>

  <div>
    <div class="grey--text text--darken-1 mb-3">
      {{ $tr('answersLabel') }}
    </div>

    <div
      v-if="!answers || !answers.length"
      class="pa-3 card-border-light"
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
        <VCardText>
          <VLayout align-top>
            <VFlex :class="{ 'xs1': isAnswerOpen(answerIdx) }">
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
                  :label="answerLabel(answerIdx)"
                  data-test="answerRadio"
                />
              </VRadioGroup>

              <VCheckbox
                v-if="isMultipleSelection"
                :key="answerIdx"
                :value="answerIdx"
                :input-value="correctAnswersIndices"
                :label="answerLabel(answerIdx)"
                @change="onCorrectAnswersIndicesUpdate"
              />

              <div
                v-if="!isAnswerOpen(answerIdx) && isInputQuestion"
                class="input-question"
              >
                {{ answerLabel(answerIdx) }}
              </div>
            </VFlex>

            <VFlex>
              <keep-alive :max="5">
                <MarkdownEditor
                  v-if="isAnswerOpen(answerIdx)"
                  :value="answer.answer"
                  @update="updateAnswerText($event, answerIdx)"
                />
              </keep-alive>
            </VFlex>

            <VSpacer />

            <VFlex>
              <AssessmentItemToolbar
                :iconActionsConfig="toolbarIconActions"
                :canMoveUp="!isAnswerFirst(answerIdx)"
                :canMoveDown="!isAnswerLast(answerIdx)"
                class="toolbar"
                data-test="toolbar"
                @click="onToolbarClick($event, answerIdx)"
              />
            </VFlex>
          </VLayout>
        </VCardText>
      </VCard>
    </div>

    <VBtn
      v-if="isEditingAllowed"
      flat
      color="primary"
      class="mt-3 ml-0"
      data-test="newAnswerBtn"
      @click="addNewAnswer"
    >
      {{ $tr('newAnswerBtnLabel') }}
    </VBtn>
  </div>

</template>

<script>

  import { AssessmentItemTypes, AssessmentItemToolbarActions } from '../../constants';
  import { getCorrectAnswersIndices, mapCorrectAnswers, swapElements } from '../../utils';

  import AssessmentItemToolbar from '../AssessmentItemToolbar/AssessmentItemToolbar.vue';
  import MarkdownEditor from '../MarkdownEditor/MarkdownEditor.vue';

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
      },
      openAnswerIdx: {
        type: Number,
      },
    },
    data() {
      return {
        correctAnswersIndices: getCorrectAnswersIndices(this.questionKind, this.answers),
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
      answerLabel(answerIdx) {
        if (!this.answers || !this.answers.length) {
          return '';
        }

        if (this.isAnswerOpen(answerIdx)) {
          return '';
        }

        return this.answers[answerIdx].answer;
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
          classes.push('correct');
        } else {
          classes.push('wrong');
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
        // do not open answer on toolbar click
        if (event.target.closest('.toolbar') !== null) {
          return;
        }

        // do not open an answer on checkbox or radio click
        if (
          event.target &&
          (event.target.classList.contains('v-label') ||
            event.target.classList.contains('v-input--selection-controls__ripple'))
        ) {
          return;
        }

        this.emitOpen(answerIdx);
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
        if (newAnswerText === this.answers[answerIdx].answer) {
          return;
        }

        const updatedAnswers = [...this.answers];
        updatedAnswers[answerIdx].answer = newAnswerText;

        this.emitUpdate(updatedAnswers);
      },
      addNewAnswer() {
        // do not allow adding more empty answers
        let updatedAnswers = [];
        if (this.answers) {
          updatedAnswers = this.answers.filter(
            answer => answer.answer !== undefined && answer.answer.trim() !== ''
          );
        }
        updatedAnswers = updateAnswersOrder(updatedAnswers);

        const defaultCorrectState = this.isInputQuestion ? true : false;
        updatedAnswers.push({
          answer: '',
          correct: defaultCorrectState,
          order: updatedAnswers.length + 1,
        });

        this.emitUpdate(updatedAnswers);
        this.emitOpen(updatedAnswers.length - 1);
      },
    },
    $trs: {
      answersLabel: 'Answers',
      noAnswersPlaceholder: 'No answers yet',
      newAnswerBtnLabel: 'New answer',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../../less/global-variables.less';

  .answer {
    position: relative;
    transition: 0.7s;

    &.editable {
      cursor: pointer;
    }

    &.closed.correct:hover {
      background-color: fade(@exercise-answer-correct, 15%);
    }

    &.closed.wrong:hover {
      background-color: fade(@exercise-answer-wrong, 15%);
    }

    .indicator {
      position: absolute;
      z-index: 1;
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

  .input-question {
    padding: 23.5px;
  }

</style>
