<template>
  <div>
    <div v-if="!answers || !answers.length">
      No answers yet
    </div>

    <VCard
      v-for="(answer, answerIdx) in answers"
      :key="answerIdx"
    >
      <div :class="getIndicatorClasses(answer)"></div>

      <VCardText>
        <VLayout>
          <VFlex xs11>
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

          <Toggle
            :isOpen="isAnswerOpen(answerIdx)"
            data-test="answerToggle"
            @close="closeAnswer"
            @open="openAnswer(answerIdx)"
          />
        </VLayout>
      </VCardText>
    </VCard>

    <VBtn
      flat
      data-test="newAnswerBtn"
      @click="addNewAnswer"
    >
      New answer
    </VBtn>
  </div>
</template>

<script>

  import { AssessmentItemTypes } from '../../constants';
  import {
    questionHasOneCorrectAnswer,
    getCorrectAnswersIndices,
    mapCorrectAnswers,
  } from '../../utils';
  import Toggle from '../Toggle/Toggle.vue';

  export default {
    name: 'AnswersEditor',
    components: {
      Toggle,
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
    },
    data() {
      return {
        openAnswerIdx: null,
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

        this.$emit('update', updatedAnswers);
      },
    },
    methods: {
      openAnswer(answerIdx) {
        this.openAnswerIdx = answerIdx;
      },
      closeAnswer() {
        this.openAnswerIdx = null;
      },
      isAnswerOpen(answerIdx) {
        return answerIdx === this.openAnswerIdx;
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
      updateAnswerText(newAnswerText, answerIdx) {
        if (newAnswerText === this.answers[answerIdx].answer) {
          return;
        }

        const updatedAnswers = [...this.answers];
        updatedAnswers[answerIdx].answer = newAnswerText;

        this.$emit('update', updatedAnswers);
      },
      addNewAnswer() {
        let updatedAnswers = [];

        if (this.answers && this.answers.length) {
          updatedAnswers = [...this.answers];
        }

        updatedAnswers.push({
          answer: '',
          correct: false,
          order: updatedAnswers.length + 1,
        });

        this.$emit('update', updatedAnswers);
        this.openAnswer(updatedAnswers.length - 1);
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
