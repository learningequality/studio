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

      <ul v-if="isInputQuestion">
        <li
          v-for="(answer, idx) in answers"
          :key="idx"
        >
          {{ answer.answer }}
        </li>
      </ul>
    </template>
  </div>
</template>

<script>

  import { AssessmentItemTypes } from '../../constants';
  import { getCorrectAnswersIndices } from '../../utils';

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
      correctAnswersIndices() {
        return getCorrectAnswersIndices(this.questionKind, this.answers);
      },
    },
  };

</script>
