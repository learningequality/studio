<template>
  <div>
    <div v-if="!answers || !answers.length">
      No answers yet
    </div>

    <template v-else>
      <template v-if="isSingleSelection || isTrueFalse">
        <VRadioGroup v-model="correctAnswersIndices">
          <VRadio
            v-for="(answer, idx) in answers"
            :key="idx"
            :label="answer.answer"
            :value="idx"
            disabled
          />
        </VRadioGroup>
      </template>

      <template v-if="isMultipleSelection">
        <VCheckbox
          v-for="(answer, idx) in answers"
          :key="idx"
          v-model="correctAnswersIndices"
          :label="answer.answer"
          :value="idx"
          disabled
        />
      </template>

      <template v-if="isInputQuestion">
        <p>{{ answers.length }} accepted answers</p>
      </template>
    </template>
  </div>
</template>

<script>

  import { AssessmentItemTypes } from '../../constants';

  export default {
    name: 'AnswersPreview',
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
      // returns an index or an array of indices based on question kind
      correctAnswersIndices() {
        if (this.isSingleSelection || this.isTrueFalse) {
          return this.answers.findIndex(answer => answer.correct);
        }

        return this.answers
          .map((answer, idx) => {
            return answer.correct ? idx : undefined;
          })
          .filter(idx => idx !== undefined);
      },
    },
  };

</script>
