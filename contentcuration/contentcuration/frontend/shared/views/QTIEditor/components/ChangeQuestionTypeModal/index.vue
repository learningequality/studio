<template>

  <KModal
    :title="changeQuestionTypeTitle$()"
    :submitText="changeQuestionTypeAction$()"
    :cancelText="cancelAction$()"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ changeQuestionTypeIntro$({ type: questionTypeLabel }) }}</p>
    <ul class="losses">
      <li
        v-for="loss in losses"
        :key="loss"
      >
        {{ lossMessages[loss]({ blank: BLANK_TEXT }) }}
      </li>
    </ul>
  </KModal>

</template>


<script>

  import { ConversionLoss } from '../../constants';
  import { BLANK_TEXT } from '../../conversion/passage';
  import { qtiEditorStrings } from '../../qtiEditorStrings';

  /**
   * Asks an author to confirm a change of question type that would remove or change some of
   * the question, saying what.
   */
  export default {
    name: 'ChangeQuestionTypeModal',

    setup() {
      const {
        changeQuestionTypeTitle$,
        changeQuestionTypeIntro$,
        changeQuestionTypeAction$,
        cancelAction$,
      } = qtiEditorStrings;

      const lossMessages = {
        [ConversionLoss.ANSWERS_REMOVED]: qtiEditorStrings.answersRemovedLoss$,
        [ConversionLoss.INCORRECT_ANSWERS_REMOVED]: qtiEditorStrings.incorrectAnswersRemovedLoss$,
        [ConversionLoss.ANY_CORRECT_ANSWER_ACCEPTED]:
          qtiEditorStrings.anyCorrectAnswerAcceptedLoss$,
        [ConversionLoss.CORRECT_ANSWERS_REDUCED]: qtiEditorStrings.correctAnswersReducedLoss$,
        [ConversionLoss.CORRECT_ANSWERS_NOT_KEPT]: qtiEditorStrings.correctAnswersNotKeptLoss$,
        [ConversionLoss.ORDER_BECOMES_ANSWER]: qtiEditorStrings.orderBecomesAnswerLoss$,
        [ConversionLoss.ORDER_NOT_KEPT]: qtiEditorStrings.orderNotKeptLoss$,
        [ConversionLoss.FORMATTING_REMOVED]: qtiEditorStrings.formattingRemovedLoss$,
        [ConversionLoss.PASSAGE_ADDED_TO_QUESTION]: qtiEditorStrings.passageAddedToQuestionLoss$,
        [ConversionLoss.SETTINGS_REMOVED]: qtiEditorStrings.settingsRemovedLoss$,
      };

      return {
        changeQuestionTypeTitle$,
        changeQuestionTypeIntro$,
        changeQuestionTypeAction$,
        cancelAction$,
        lossMessages,
        BLANK_TEXT,
      };
    },

    props: {
      /** The label of the question type the author picked */
      questionTypeLabel: {
        type: String,
        required: true,
      },
      /** ConversionLoss codes: what the change would remove or change */
      losses: {
        type: Array,
        required: true,
        validator: losses => losses.every(loss => Object.values(ConversionLoss).includes(loss)),
      },
    },

    emits: ['submit', 'cancel'],
  };

</script>


<style scoped>

  .losses {
    padding-inline-start: 24px;
    margin: 0;
  }

  .losses li + li {
    margin-top: 8px;
  }

</style>
