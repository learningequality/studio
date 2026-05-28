<template>

  <div>
    <VLayout>
      <div
        class="kind-select-container"
        style="width: 100%"
      >
        <div
          class="field-label"
          :style="{ color: $themePalette.grey.v_800 }"
        >
          {{ $tr('typeLabel') }}
        </div>
        <KSelect
          :key="kindSelectKey"
          v-model="selectedKind"
          :options="kindSelectItems"
          :label="$tr('questionTypeLabel')"
          class="kind-select"
          data-test="kindSelect"
        />
      </div>
    </VLayout>

    <VLayout>
      <VFlex>
        <ErrorList
          :errors="questionErrorMessages"
          data-test="questionErrors"
        />

        <div class="grey--text mb-1 text--darken-2">
          {{ $tr('questionLabel') }}
        </div>

        <transition name="fade">
          <keep-alive include="TipTapEditor">
            <!--analyticsLabel="Question"-->
            <TipTapEditor
              v-if="isQuestionOpen"
              v-model="question"
              mode="edit"
              minHeight="80px"
              :autofocus="shouldAutofocusQuestion"
              :imageProcessor="EditorImageProcessor"
              @update="onQuestionUpdate"
              @minimize="closeQuestion"
            />

            <div
              v-else
              class="pb-3 pl-2 pr-2 pt-3 question-text"
              :style="{ border: `1px solid ${$themePalette.grey.v_300}` }"
              data-test="questionText"
              @click="openQuestion"
            >
              <VLayout
                align-start
                justify-space-between
              >
                <VFlex grow>
                  <TipTapEditor
                    v-model="question"
                    mode="view"
                    tabindex="-1"
                  />
                </VFlex>

                <VFlex shrink>
                  <button
                    class="v-btn v-btn--flat v-btn--icon v-size--default"
                    data-test="editQuestionButton"
                    @click.stop="openQuestion"
                  >
                    <Icon
                      :color="$themePalette.grey.v_800"
                      icon="edit"
                      class="mr-2"
                    />
                  </button>
                </VFlex>
              </VLayout>
            </div>
          </keep-alive>
        </transition>
      </VFlex>
    </VLayout>

    <VLayout
      v-if="kind !== AssessmentItemTypes.FREE_RESPONSE"
      mt-4
    >
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

        <div
          class="hints-divider"
          :style="{ borderTop: `1px solid ${$themeTokens.fineLine}` }"
        ></div>

        <HintsEditor
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

  import { mapGetters } from 'vuex';

  import HintsEditor from '../HintsEditor/HintsEditor';
  import AnswersEditor from '../AnswersEditor/AnswersEditor';
  import translator from '../../translator';
  import { updateAnswersToQuestionType, assessmentItemKey } from '../../utils';
  import { AssessmentItemTypeLabels } from '../../constants';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';
  import {
    ContentModalities,
    AssessmentItemTypes,
    ValidationErrors,
    FeatureFlagKeys,
  } from 'shared/constants';
  import ErrorList from 'shared/views/ErrorList/ErrorList';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

  export default {
    name: 'AssessmentItemEditor',
    components: {
      ErrorList,
      AnswersEditor,
      HintsEditor,
      TipTapEditor,
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
      nodeId: {
        type: String,
        required: true,
      },
      item: {
        type: Object,
        default: null,
      },
      /**
       * An array of error codes related to the item.
       */
      errors: {
        type: Array,
        default: () => [],
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
        default: null,
      },
    },
    data() {
      return {
        isQuestionOpen: false,
        shouldAutofocusQuestion: false,
        openHintIdx: null,
        openAnswerIdx: null,
        kindSelectKey: 0,
        AssessmentItemTypes,
        EditorImageProcessor,
      };
    },
    computed: {
      ...mapGetters(['hasFeatureEnabled']),
      ...mapGetters('contentNode', ['getContentNode']),
      question() {
        if (!this.item || !this.item.question) {
          return '';
        }

        return this.item.question;
      },
      modality() {
        return this.getContentNode(this.nodeId)?.extra_fields?.options?.modality;
      },
      kind() {
        if (!this.item || !this.item.type) {
          return AssessmentItemTypes.SINGLE_SELECTION;
        }

        return this.item.type;
      },
      kindSelectItems() {
        const items = [
          {
            value: AssessmentItemTypes.SINGLE_SELECTION,
            label: translator.$tr(AssessmentItemTypeLabels[AssessmentItemTypes.SINGLE_SELECTION]),
          },
          {
            value: AssessmentItemTypes.MULTIPLE_SELECTION,
            label: translator.$tr(AssessmentItemTypeLabels[AssessmentItemTypes.MULTIPLE_SELECTION]),
          },
          {
            value: AssessmentItemTypes.INPUT_QUESTION,
            label: translator.$tr(AssessmentItemTypeLabels[AssessmentItemTypes.INPUT_QUESTION]),
          },
          {
            value: AssessmentItemTypes.TRUE_FALSE,
            label: translator.$tr(AssessmentItemTypeLabels[AssessmentItemTypes.TRUE_FALSE]),
          },
        ];

        if (
          this.hasFeatureEnabled(FeatureFlagKeys.survey) &&
          this.modality === ContentModalities.SURVEY
        ) {
          items.push({
            value: AssessmentItemTypes.FREE_RESPONSE,
            label: translator.$tr(AssessmentItemTypeLabels[AssessmentItemTypes.FREE_RESPONSE]),
          });
        }

        return items;
      },
      selectedKind: {
        get() {
          return (
            this.kindSelectItems.find(option => option.value === this.kind) ||
            this.kindSelectItems[0]
          );
        },
        set(option) {
          const newKind = option?.value;
          if (!newKind) {
            return;
          }
          this.onKindUpdate(newKind);
        },
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
          errorMessages.push(translator.$tr(`errorQuestionRequired`));
        } else if (
          this.errors &&
          this.errors.includes(ValidationErrors.INVALID_COMPLETION_TYPE_FOR_FREE_RESPONSE_QUESTION)
        ) {
          errorMessages.push(translator.$tr(`errorInvalidQuestionType`));
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
            errorMessages.push(translator.$tr(`errorMissingAnswer`));
            break;

          case AssessmentItemTypes.MULTIPLE_SELECTION:
            errorMessages.push(translator.$tr(`errorChooseAtLeastOneCorrectAnswer`));
            break;

          case AssessmentItemTypes.INPUT_QUESTION:
            errorMessages.push(translator.$tr(`errorProvideAtLeastOneCorrectAnswer`));
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
        this.shouldAutofocusQuestion = true;
        this.openQuestion();
      }
    },
    methods: {
      updateItem(payload) {
        payload = {
          ...assessmentItemKey(this.item),
          ...payload,
        };
        this.$emit('update', payload);
      },
      changeKind(newKind) {
        const newAnswers = updateAnswersToQuestionType(newKind, this.answers);
        this.closeAnswer();
        this.updateItem({
          type: newKind,
          answers: newAnswers,
        });
      },
      // question type KSelect needs to be rerendered when confirmation dialog
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

          case AssessmentItemTypes.FREE_RESPONSE:
            if (typeof this.openDialog === 'function' && this.answers.length > 0) {
              this.openDialog({
                title: this.$tr('dialogTitle'),
                message: this.$tr('dialogMessageChangeToFreeResponse'),
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
      typeLabel: 'Type',
      questionTypeLabel: 'Response type',
      questionLabel: 'Question',
      dialogTitle: 'Changing question type',
      dialogSubmitBtnLabel: 'Change',
      dialogMessageChangeToSingleSelection:
        "Switching to 'single choice' will set only one answer as correct. Continue?",
      dialogMessageChangeToTrueFalse:
        "Switching to 'true or false' will remove all current answers. Continue?",
      dialogMessageChangeToInput:
        "Switching to 'numeric input' will set all answers as correct and remove all non-numeric answers. Continue?",
      dialogMessageChangeToFreeResponse:
        "Switching to 'free response' will remove all current answers. Continue?",
    },
  };

</script>


<style lang="scss" scoped>

  .kind-select-container {
    margin-bottom: 16px;
  }

  .field-label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
  }

  .kind-select {
    width: 100%;
    max-width: 314px;
  }

  .hints-divider {
    max-width: none !important;
    // Negative margin to match the horizontal padding of the parent container
    margin: 16px calc(-1 * var(--question-card-horizontal-padding, 20px)) 0;
  }

  .question-text {
    transition: 0.7s;

    &:hover {
      cursor: pointer;
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-greyBackground-base);
    }
  }

</style>
