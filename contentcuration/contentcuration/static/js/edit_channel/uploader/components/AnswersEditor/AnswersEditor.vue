<template>
  <div>
    <div class="grey--text text--darken-1 mb-3">
      Answers
    </div>

    <div v-if="!answers || !answers.length">
      No answers yet
    </div>

    <VCard
      v-for="(answer, answerIdx) in answers"
      :key="answerIdx"
      :style="getAnswerPointerStyle(answerIdx)"
      data-test="answer"
      @click="onAnswerClick($event, answerIdx)"
    >
      <div :class="getIndicatorClasses(answer)"></div>

      <VCardText>
        <VLayout>
          <VFlex xs8>
            <template v-if="!isAnswerOpen(answerIdx)">
              <!--
                VRadio cannot be used without VRadioGroup like VCheckbox but it can
                be solved by wrapping each VRadio to VRadioGroup
                https://github.com/vuetifyjs/vuetify/issues/2345
              -->
              <VRadioGroup
                v-if="hasOneCorrectAnswer"
                v-model="correctAnswersIndices"
              >
                <VRadio
                  :value="answerIdx"
                  :label="answer.answer"
                  data-test="answerRadio"
                />
              </VRadioGroup>

              <VCheckbox
                v-if="isMultipleSelection"
                :key="answerIdx"
                v-model="correctAnswersIndices"
                :value="answerIdx"
                :label="answer.answer"
                data-test="answerCheckbox"
              />

              <div
                v-if="isInputQuestion"
                class="input-question"
              >
                {{ answer.answer }}
              </div>
            </template>

            <template v-if="isAnswerOpen(answerIdx)">
              <VLayout>
                <VFlex xs1>
                  <VRadioGroup
                    v-if="hasOneCorrectAnswer"
                    v-model="correctAnswersIndices"
                  >
                    <VRadio
                      :value="answerIdx"
                      data-test="answerRadio"
                    />
                  </VRadioGroup>

                  <VCheckbox
                    v-if="isMultipleSelection"
                    :key="answerIdx"
                    v-model="correctAnswersIndices"
                    :value="answerIdx"
                    data-test="answerCheckbox"
                  />
                </VFlex>

                <VFlex xs10>
                  <VTextField
                    :value="answer.answer"
                    data-test="editAnswerTextInput"
                    @input="updateAnswerText($event, answerIdx)"
                  />
                </VFlex>
              </VLayout>
            </template>
          </VFlex>

          <VSpacer />
          <AssessmentItemToolbar
            :displayMenu="false"
            :displayEditIcon="false"
            :canMoveUp="!isAnswerFirst(answerIdx)"
            :canMoveDown="!isAnswerLast(answerIdx)"
            class="toolbar"
            @click="onToolbarClick($event, answerIdx)"
          />
        </VLayout>
      </VCardText>
    </VCard>

    <VBtn
      v-if="isEditingAllowed"
      flat
      data-test="newAnswerBtn"
      @click="addNewAnswer"
    >
      New answer
    </VBtn>
  </div>
</template>

<script>

  import { AssessmentItemTypes, AssessmentItemToolbarActions } from '../../constants';
  import {
    questionHasOneCorrectAnswer,
    getCorrectAnswersIndices,
    mapCorrectAnswers,
    swapElements,
    sanitizeAssessmentItemAnswers,
  } from '../../utils';
  import AssessmentItemToolbar from '../AssessmentItemToolbar/AssessmentItemToolbar.vue';

  export default {
    name: 'AnswersEditor',
    components: {
      AssessmentItemToolbar,
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
      hasOneCorrectAnswer() {
        return questionHasOneCorrectAnswer(this.questionKind);
      },
      isEditingAllowed() {
        return !this.isTrueFalse;
      },
    },
    watch: {
      answers() {
        this.correctAnswersIndices = getCorrectAnswersIndices(this.questionKind, this.answers);
      },
      correctAnswersIndices(newValue, oldValue) {
        if (oldValue !== null) {
          if (this.hasOneCorrectAnswer && newValue === oldValue) {
            return;
          }

          if (
            !this.hasOneCorrectAnswer &&
            JSON.stringify([...newValue].sort()) === JSON.stringify([...oldValue].sort())
          ) {
            return;
          }
        }

        const updatedAnswers = mapCorrectAnswers(this.answers, this.correctAnswersIndices);

        this.emitUpdate(updatedAnswers);
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
      getAnswerPointerStyle(answerIdx) {
        return this.isEditingAllowed && !this.isAnswerOpen(answerIdx) ? { cursor: 'pointer' } : {};
      },
      getIndicatorClasses(answer) {
        const classes = ['indicator'];

        if (answer.correct) {
          classes.push('correct');
        } else {
          classes.push('wrong');
        }

        return classes;
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
        updatedAnswers = updatedAnswers.map((answer, answerIdx) => {
          return {
            ...answer,
            order: answerIdx + 1,
          };
        });

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
        updatedAnswers = updatedAnswers.map((answer, answerIdx) => {
          return {
            ...answer,
            order: answerIdx + 1,
          };
        });

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
        updatedAnswers = updatedAnswers.map((answer, answerIdx) => {
          return {
            ...answer,
            order: answerIdx + 1,
          };
        });

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
        // primarily to disable adding more empty hints
        const updatedAnswers = sanitizeAssessmentItemAnswers(this.answers, true);

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
  };

</script>

<style lang="less" scoped>

  @import '../../../../../less/global-variables.less';

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

  .input-question {
    padding: 23.5px;
  }

</style>
