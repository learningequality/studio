<template>

  <div>
    <div
      class="answers-label"
      :style="{ color: $themeTokens.annotation }"
    >
      {{ answersLabel }}
    </div>
    <div
      class="answers-list"
      :class="{ 'small-screen': isSmallScreen }"
    >
      <div
        v-if="!answers || !answers.length"
        class="answer-border no-answers-placeholder"
        :style="{ borderColor: $themeTokens.fineLine }"
      >
        {{ $tr('noAnswersPlaceholder') }}
      </div>
      <div
        v-for="(answer, answerIdx) in answers"
        :key="answerIdx"
        class="answer-border"
        :style="{
          borderColor: answer.correct ? $themeTokens.correct : $themeTokens.fineLine,
          backgroundColor: answer.correct ? $themePalette.green.v_100 : 'transparent',
        }"
        data-test="answer"
        @click="onAnswerClick($event, answerIdx)"
      >
        <div :class="answerClasses(answerIdx)">
          <div
            class="answer-card-text"
            :class="{ 'is-closed': !isAnswerOpen(answerIdx), 'small-screen': isSmallScreen }"
          >
            <div
              class="answer-layout"
              :class="{ 'is-open': isAnswerOpen(answerIdx), 'small-screen': isSmallScreen }"
            >
              <!-- Selection controls -->
              <div
                v-if="!isInputQuestion"
                class="answer-selection"
              >
                <KCheckbox
                  :checked="answer.correct"
                  @change="toggleCorrectAnswer(answerIdx, $event)"
                />
              </div>

              <!-- Answer content -->
              <div class="answer-content">
                <!-- Input question shows a text field with type of `number` -->
                <div v-if="isInputQuestion">
                  <input
                    v-if="isAnswerOpen(answerIdx)"
                    :value="answer.answer"
                    class="answer-number"
                    :class="answerNumberClasses"
                    type="number"
                    :placeholder="$tr('enterNumberPlaceholder')"
                    @input="updateAnswerText($event.target.value, answerIdx)"
                  >
                  <div
                    v-else
                    class="answer-view-text"
                  >
                    <div class="answer-view-editor">
                      <span
                        v-if="!answer.answer"
                        :style="{ color: $themePalette.grey.v_500 }"
                      >
                        {{ $tr('enterNumberPlaceholder') }}
                      </span>
                      <template v-else>
                        {{ answer.answer }}
                      </template>
                    </div>
                  </div>
                </div>

                <div v-else>
                  <!-- View mode: TipTapEditor in view mode to render Markdown properly -->
                  <div
                    v-if="!isAnswerOpen(answerIdx)"
                    class="answer-view-text"
                  >
                    <div class="answer-view-editor">
                      <TipTapEditor
                        v-model="answer.answer"
                        mode="view"
                        :image-processor="EditorImageProcessor"
                      />
                    </div>
                  </div>
                  <!-- Edit mode: TipTapEditor -->
                  <keep-alive
                    v-else
                    :max="5"
                  >
                    <TipTapEditor
                      v-model="answer.answer"
                      class="editor is-open"
                      :style="{ backgroundColor: $themePalette.white }"
                      mode="edit"
                      minHeight="80px"
                      :autofocus="true"
                      :image-processor="EditorImageProcessor"
                      @update="updateAnswerText($event, answerIdx)"
                      @minimize="emitClose"
                    />
                  </keep-alive>
                </div>
              </div>

              <div
                v-if="toolbarIconActions.length > 0"
                class="answer-actions"
              >
                <AssessmentItemToolbar
                  :iconActionsConfig="toolbarIconActions"
                  :collapse="isSmallScreen"
                  :displayMenu="isSmallScreen"
                  :canEdit="!isAnswerOpen(answerIdx)"
                  :canMoveUp="!isAnswerFirst(answerIdx)"
                  :canMoveDown="!isAnswerLast(answerIdx)"
                  class="toolbar"
                  analyticsLabel="Answer"
                  data-test="toolbar"
                  @click="onToolbarClick($event, answerIdx)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <KButton
      v-if="isEditingAllowed"
      class="answer-editor-button mt-3"
      data-test="newAnswerBtn"
      appearance="flat-button"
      :appearanceOverrides="buttonAppearanceOverrides"
      @click="addNewAnswer"
    >
      <div class="add-answer-btn-content">
        <KIcon
          icon="plus"
          :color="$themeTokens.primary"
        />
        <span>{{ $tr('newAnswerBtnLabel') }}</span>
      </div>
    </KButton>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import AssessmentItemToolbar from '../AssessmentItemToolbar';
  import { AssessmentItemToolbarActions } from '../../constants';
  import { getCorrectAnswersIndices, mapCorrectAnswers } from '../../utils';
  import { AssessmentItemTypes } from 'shared/constants';
  import { swapElements } from 'shared/utils/helpers';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

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
      TipTapEditor,
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
    },
    data() {
      return {
        EditorImageProcessor, // Make it available in the template
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
      answersLabel() {
        if (this.isSingleSelection || this.isTrueFalse) {
          return this.$tr('answersLabelSingleChoice');
        } else if (this.isMultipleSelection) {
          return this.$tr('answersLabelMultipleChoice');
        } else if (this.isInputQuestion) {
          return this.$tr('answersLabelNumeric');
        }
        return this.$tr('answersLabel');
      },
      toolbarIconActions() {
        // On small screens, collapse ALL actions into the ⋮ menu so only
        // one icon renders, giving the answer text room to breathe.
        const deleteAction = this.isSmallScreen
          ? [AssessmentItemToolbarActions.DELETE_ITEM, { collapse: true }]
          : AssessmentItemToolbarActions.DELETE_ITEM;

        if (this.isSingleSelection || this.isMultipleSelection) {
          return [
            [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
            [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
            deleteAction,
          ];
        }

        if (this.isInputQuestion) {
          return [deleteAction];
        }

        return [];
      },
      screenSizeLevel() {
        const { windowBreakpoint } = useKResponsiveWindow();
        return windowBreakpoint.value ?? 0;
      },
      isSmallScreen() {
        return this.screenSizeLevel <= 1;
      },
      buttonAppearanceOverrides() {
        return {
          backgroundColor: this.$themeBrand.primary.v_50,
          border: `1px dashed ${this.$themeBrand.primary.v_200}`,
          color: `${this.$themeTokens.primary} !important`,
          fontSize: '14px',
          fontWeight: '600',
          textTransform: 'none',
          ':hover': {
            backgroundColor: this.$themeBrand.primary.v_100,
          },
        };
      },
      answerNumberClasses() {
        return this.$computedClass({
          backgroundColor: this.$themePalette.white,
          border: `1px solid ${this.$themePalette.grey.v_300}`,
          ':focus': {
            borderColor: this.$themePalette.grey.v_500,
          },
        });
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

        if (!this.isAnswerOpen(answerIdx)) {
          classes.push('closed');
          classes.push(
            this.$computedClass({
              cursor: 'pointer',
              ':hover': {
                backgroundColor: this.$themePalette.grey.v_100,
              },
            }),
          );
        }

        return classes;
      },
      toggleCorrectAnswer(answerIdx, isChecked) {
        if (this.shouldHaveOneCorrectAnswer) {
          if (isChecked) {
            this.onCorrectAnswersIndicesUpdate(answerIdx);
          }
        } else {
          // multiple selection
          let indices = [...this.correctAnswersIndices];
          if (isChecked && !indices.includes(answerIdx)) {
            indices.push(answerIdx);
          } else if (!isChecked && indices.includes(answerIdx)) {
            indices = indices.filter(idx => idx !== answerIdx);
          }
          this.onCorrectAnswersIndicesUpdate(indices);
        }
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

        // do not open on checkbox click
        if (
          event.target.tagName.toLowerCase() === 'input' ||
          event.target.closest('.answer-selection') !== null
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
      answersLabelSingleChoice: 'Answer options — select one correct answer',
      answersLabelMultipleChoice: 'Answer options — select all correct answers',
      answersLabelNumeric: 'Answer options — enter all acceptable spellings or formats',
      noAnswersPlaceholder: 'Question has no answer options',
      newAnswerBtnLabel: 'Add option',
      enterNumberPlaceholder: 'Enter number',
    },
  };

</script>


<style lang="scss" scoped>

  .answers-label {
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 600;
  }

  .answers-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .answer-border {
    border: 1px solid;
    border-radius: 4px;
    transition: background-color 0.3s;
  }

  .no-answers-placeholder {
    padding: 16px;
  }

  .answer-card-text {
    padding: 7.5px;

    &.small-screen {
      &.is-closed {
        font-size: 10px;
      }
    }

    &.is-closed {
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .answer-layout {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &.is-open {
      align-items: flex-start;
    }

    &.small-screen {
      .answer-actions {
        margin-left: 4px;
      }

      &.is-open {
        flex-direction: column-reverse;

        .answer-actions {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          margin-bottom: 8px;
          margin-left: 0;
        }
      }
    }
  }

  .answer-selection {
    flex-shrink: 0;
    margin-right: 16px;

    .small-screen & {
      margin-right: 6px;
    }
  }

  .answer-content {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .answer-view-text {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 42px;
    padding: 0 4px;
    overflow: hidden;
    border-radius: 4px;

    .small-screen.is-closed & {
      min-height: 36px;
    }
  }

  .answer-view-editor {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    .small-screen.is-closed & {
      font-size: 12px;
    }
  }

  .answer-number {
    width: 100%;
    padding: 10px;
    font-size: 14px;
    border-radius: 4px;
    outline: none;

    .small-screen & {
      padding: 7px 8px;
      font-size: 13px;
    }

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      margin: 0;
      appearance: none;
    }

    &[type='number'] {
      appearance: textfield;
    }
  }

  .answer-actions {
    flex-shrink: 0;
    margin-left: 16px;
  }

  .answer {
    &.closed:hover {
      cursor: pointer;
    }
  }

  .answer-editor-button {
    justify-content: center;
    width: 100%;
    padding: 11px 16px !important;
    margin-top: 10px;
    line-height: unset !important;
    border-radius: 4px !important;
  }

  .add-answer-btn-content {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
  }

</style>
