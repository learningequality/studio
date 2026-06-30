<template>

  <div class="choice-editor">
    <!-- Prompt -->
    <div class="choice-editor__section">
      <div
        class="field-label"
        :style="{ color: $themePalette.grey.v_800 }"
      >
        {{ questionLabel$() }}
      </div>

      <!-- Prompt: open (edit mode) -->
      <div
        v-if="mode === 'edit' && isQuestionOpen"
        class="choice-editor__prompt-wrap"
      >
        <TipTapEditor
          :value="state.prompt"
          mode="edit"
          :minHeight="'80px'"
          class="editor"
          @update="setPrompt"
          @minimize="closeQuestion"
        />
        <ValidationMessage :show="questionHasError">
          {{ errorPromptRequired$() }}
        </ValidationMessage>
      </div>

      <!-- Prompt: closed (view or edit-collapsed) -->
      <div
        v-else
        class="answer-border"
        :class="{ 'is-clickable': mode === 'edit' }"
        :style="{ borderColor: $themeTokens.fineLine }"
        @click="mode === 'edit' && openQuestion()"
      >
        <div class="answer-card-text is-closed">
          <div class="answer-layout">
            <div class="answer-content">
              <TipTapEditor
                :value="state.prompt"
                mode="view"
                class="editor"
              />
            </div>
            <div
              v-if="mode === 'edit'"
              class="answer-actions"
            >
              <KIconButton
                icon="edit"
                :color="$themePalette.grey.v_800"
                :aria-label="toolbarLabelEdit$()"
                :tooltip="toolbarLabelEdit$()"
                size="small"
                @click.stop="openQuestion"
              />
            </div>
          </div>
        </div>
        <ValidationMessage
          :show="questionHasError"
          :style="{ padding: '0 8px 8px' }"
        >
          {{ errorPromptRequired$() }}
        </ValidationMessage>
      </div>
    </div>

    <!-- Global interaction errors -->
    <ValidationMessage :show="noCorrectAnswerError">
      {{ errorNoCorrectAnswer$() }}
    </ValidationMessage>
    <ValidationMessage :show="tooManyCorrectError">
      {{ errorTooManyCorrectAnswers$() }}
    </ValidationMessage>
    <ValidationMessage :show="tooFewChoicesError">
      {{ errorTooFewChoices$() }}
    </ValidationMessage>

    <!-- Choice list -->
    <div
      v-if="mode === 'edit' || showAnswers"
      class="choice-editor__section"
    >
      <div
        class="answers-label"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ answersLabel }}
      </div>

      <div
        class="answers-list"
        role="list"
      >
        <div
          v-for="(answer, index) in state.answers"
          :key="answer.id"
          class="answer-border"
          role="listitem"
          :class="{ 'is-clickable': mode === 'edit' && openChoiceId !== answer.id }"
          :style="{
            borderColor:
              answer.correct && mode === 'view' && showAnswers
                ? $themePalette.green.v_500
                : $themeTokens.fineLine,
            backgroundColor:
              answer.correct && mode === 'view' && showAnswers
                ? $themePalette.green.v_50
                : hoveredId === answer.id
                  ? $themeTokens.fineLine
                  : null,
          }"
          @click="onRowClick($event, answer.id)"
          @mouseenter="hoveredId = answer.id"
          @mouseleave="hoveredId = null"
        >
          <div
            class="answer-card-text"
            :class="{
              'is-closed': mode !== 'edit' || openChoiceId !== answer.id,
              'small-screen': isSmallScreen,
            }"
          >
            <div
              class="answer-layout"
              :class="{
                'is-open': mode === 'edit' && openChoiceId === answer.id,
                'small-screen': isSmallScreen,
              }"
            >
              <!-- Selection control -->
              <div class="answer-selection">
                <KRadioButton
                  v-if="isSingleSelect"
                  :currentValue="correctAnswerId"
                  :buttonValue="answer.id"
                  :label="markCorrectLabel$()"
                  :showLabel="false"
                  :aria-label="markCorrectLabel$()"
                  :disabled="mode !== 'edit'"
                  :style="{ width: 'auto' }"
                  @change="onToggleCorrect(answer.id)"
                />
                <KCheckbox
                  v-else
                  :checked="answer.correct"
                  :label="markCorrectLabel$()"
                  :showLabel="false"
                  :aria-label="markCorrectLabel$()"
                  :disabled="mode !== 'edit'"
                  @change="onToggleCorrect(answer.id)"
                />
              </div>

              <div class="answer-content">
                <TipTapEditor
                  :value="answer.content"
                  :mode="mode === 'edit' && openChoiceId === answer.id ? 'edit' : 'view'"
                  :style="
                    mode === 'edit' && openChoiceId === answer.id
                      ? { backgroundColor: $themePalette.white }
                      : {}
                  "
                  :minHeight="'80px'"
                  :autofocus="mode === 'edit' && openChoiceId === answer.id"
                  class="editor"
                  @update="html => setChoiceContent(answer.id, html)"
                  @minimize="closeChoice"
                />
                <ValidationMessage :show="choiceHasError(answer.id)">
                  {{ errorEmptyChoiceContent$() }}
                </ValidationMessage>
              </div>

              <!-- Actions toolbar -->
              <div
                v-if="mode === 'edit' && !answer.fixed"
                class="answer-actions toolbar"
              >
                <KIconButton
                  v-if="openChoiceId !== answer.id"
                  icon="edit"
                  :color="$themePalette.grey.v_800"
                  :aria-label="toolbarLabelEdit$()"
                  :tooltip="toolbarLabelEdit$()"
                  size="small"
                  data-test="editChoiceBtn"
                  @click.stop="openChoice(answer.id)"
                />

                <!-- Large screen: inline up / down / delete -->
                <template v-if="!isSmallScreen">
                  <KIconButton
                    icon="chevronUp"
                    :aria-label="moveChoiceUpBtn$()"
                    :tooltip="moveChoiceUpBtn$()"
                    :disabled="index === 0"
                    :color="index === 0 ? $themeTokens.textDisabled : $themePalette.grey.v_800"
                    size="small"
                    @click.stop="moveChoiceUp(answer.id)"
                  />
                  <KIconButton
                    icon="chevronDown"
                    :aria-label="moveChoiceDownBtn$()"
                    :tooltip="moveChoiceDownBtn$()"
                    :disabled="index === state.answers.length - 1"
                    :color="
                      index === state.answers.length - 1
                        ? $themeTokens.textDisabled
                        : $themePalette.grey.v_800
                    "
                    size="small"
                    @click.stop="moveChoiceDown(answer.id)"
                  />
                  <KIconButton
                    icon="trash"
                    :aria-label="deleteChoiceBtn$()"
                    :tooltip="deleteChoiceBtn$()"
                    :disabled="state.answers.length <= 1"
                    :color="
                      state.answers.length <= 1
                        ? $themeTokens.textDisabled
                        : $themePalette.grey.v_800
                    "
                    size="small"
                    @click.stop="onRemoveChoice(answer.id)"
                  />
                </template>

                <!-- Small screen: CollapsibleToolbar dropdown -->
                <CollapsibleToolbar
                  v-else
                  :actions="getChoiceRowActions(answer.id, index)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add choice button (edit only) -->
      <KButton
        v-if="mode === 'edit'"
        appearance="flat-button"
        :appearanceOverrides="buttonAppearanceOverrides"
        class="answer-editor-button"
        :aria-label="addChoiceBtn$()"
        @click="onAddChoice"
      >
        <div class="add-answer-btn-content">
          <KIcon
            icon="plus"
            :color="$themePalette.blue.v_500"
          />
          <span>{{ addChoiceBtn$() }}</span>
        </div>
      </KButton>
    </div>
  </div>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { QuestionType, ValidationError } from '../../constants';
  import { useChoiceInteraction } from '../../composables/useChoiceInteraction';
  import CollapsibleToolbar from '../../components/CollapsibleToolbar/index.vue';
  import ValidationMessage from '../../components/ValidationMessage/index.vue';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';

  export default {
    name: 'ChoiceInteractionEditor',

    components: { TipTapEditor, CollapsibleToolbar, ValidationMessage },

    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();

      const {
        addChoiceBtn$,
        deleteChoiceBtn$,
        moveChoiceUpBtn$,
        moveChoiceDownBtn$,
        markCorrectLabel$,
        errorPromptRequired$,
        errorNoCorrectAnswer$,
        errorTooManyCorrectAnswers$,
        errorEmptyChoiceContent$,
        errorTooFewChoices$,
        questionLabel$,
        answersLabelSingleChoice$,
        answersLabelMultipleChoice$,
        toolbarLabelEdit$,
      } = qtiEditorStrings;

      // questionType prop is not a Ref — wrap it so useChoiceInteraction can react to changes.
      const questionTypeRef = computed(() => props.questionType);

      const {
        state,
        bodyXml,
        declarations,
        errors,
        runValidation,
        addChoice,
        removeChoice,
        moveChoiceUp,
        moveChoiceDown,
        toggleCorrectChoice,
        setPrompt,
        setChoiceContent,
      } = useChoiceInteraction(props.interaction, questionTypeRef);

      const isQuestionOpen = ref(false);
      const openChoiceId = ref(null);

      function openQuestion() {
        isQuestionOpen.value = true;
        openChoiceId.value = null;
      }

      function closeQuestion() {
        isQuestionOpen.value = false;
      }

      function openChoice(id) {
        openChoiceId.value = id;
        isQuestionOpen.value = false;
      }

      function closeChoice() {
        openChoiceId.value = null;
      }

      watch(
        () => props.mode,
        newMode => {
          if (newMode === 'edit') {
            if (!state.value.prompt || !state.value.prompt.trim()) {
              openQuestion();
            } else if (state.value.answers.length > 0) {
              openChoice(state.value.answers[0].id);
            }
          } else {
            isQuestionOpen.value = false;
            openChoiceId.value = null;
          }
        },
        { immediate: true },
      );

      watch(bodyXml, newXml => emit('update:bodyXml', newXml), { immediate: true });
      watch(declarations, newDecls => emit('update:responseDeclarations', newDecls), {
        immediate: true,
      });

      const isSingleSelect = computed(() => props.questionType === QuestionType.SINGLE_SELECT);
      const isSmallScreen = computed(() => windowIsSmall.value);

      const answersLabel = computed(() =>
        isSingleSelect.value ? answersLabelSingleChoice$() : answersLabelMultipleChoice$(),
      );

      const correctAnswerId = computed(() => state.value.answers.find(a => a.correct)?.id ?? null);

      const errorCodes = computed(() => errors.value.map(e => e.code));
      const emptyChoiceIds = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.EMPTY_CHOICE_CONTENT)
              .map(e => e.id),
          ),
      );

      const questionHasError = computed(() =>
        errorCodes.value.includes(ValidationError.PROMPT_REQUIRED),
      );
      const noCorrectAnswerError = computed(
        () =>
          errors.value.length > 0 && errorCodes.value.includes(ValidationError.NO_CORRECT_ANSWER),
      );
      const tooManyCorrectError = computed(
        () =>
          errors.value.length > 0 &&
          errorCodes.value.includes(ValidationError.TOO_MANY_CORRECT_ANSWERS),
      );
      const tooFewChoicesError = computed(
        () => errors.value.length > 0 && errorCodes.value.includes(ValidationError.TOO_FEW_CHOICES),
      );

      function choiceHasError(id) {
        return emptyChoiceIds.value.has(id);
      }

      function onToggleCorrect(id) {
        toggleCorrectChoice(id);
        runValidation();
      }

      function onAddChoice() {
        addChoice();
        runValidation();
        openChoiceId.value = state.value.answers[state.value.answers.length - 1]?.id ?? null;
      }

      function onRemoveChoice(id) {
        const index = state.value.answers.findIndex(a => a.id === id);
        removeChoice(id);
        runValidation();
        if (openChoiceId.value === id) {
          openChoiceId.value = null;
          const nextIdx = Math.min(index, state.value.answers.length - 1);
          if (nextIdx >= 0) openChoiceId.value = state.value.answers[nextIdx]?.id ?? null;
        }
      }

      function onRowClick(event, id) {
        if (props.mode !== 'edit') return;
        if (openChoiceId.value === id) return;
        if (
          event.target.closest('.toolbar') ||
          event.target.closest('input') ||
          event.target.closest('.answer-selection')
        )
          return;
        openChoiceId.value = id;
      }

      function getChoiceRowActions(answerId, index) {
        return [
          {
            id: 'up',
            icon: 'chevronUp',
            label: moveChoiceUpBtn$(),
            disabled: index === 0,
            handler: () => moveChoiceUp(answerId),
            collapsed: false,
          },
          {
            id: 'down',
            icon: 'chevronDown',
            label: moveChoiceDownBtn$(),
            disabled: index === state.value.answers.length - 1,
            handler: () => moveChoiceDown(answerId),
            collapsed: false,
          },
          {
            id: 'delete',
            icon: 'trash',
            label: deleteChoiceBtn$(),
            disabled: state.value.answers.length <= 1,
            handler: () => onRemoveChoice(answerId),
            collapsed: false,
          },
        ];
      }

      const hoveredId = ref(null);

      return {
        state,
        isSingleSelect,
        isSmallScreen,
        answersLabel,
        isQuestionOpen,
        openQuestion,
        closeQuestion,
        openChoiceId,
        openChoice,
        closeChoice,
        onRowClick,
        correctAnswerId,
        questionHasError,
        noCorrectAnswerError,
        tooManyCorrectError,
        tooFewChoicesError,
        choiceHasError,
        setPrompt,
        setChoiceContent,
        onToggleCorrect,
        onAddChoice,
        onRemoveChoice,
        moveChoiceUp,
        moveChoiceDown,
        hoveredId,
        getChoiceRowActions,
        addChoiceBtn$,
        deleteChoiceBtn$,
        moveChoiceUpBtn$,
        moveChoiceDownBtn$,
        markCorrectLabel$,
        errorPromptRequired$,
        errorNoCorrectAnswer$,
        errorTooManyCorrectAnswers$,
        errorEmptyChoiceContent$,
        errorTooFewChoices$,
        questionLabel$,
        toolbarLabelEdit$,
      };
    },

    props: {
      interaction: {
        type: Object,
        required: true,
        validator: val => typeof val.bodyXml === 'string',
      },
      questionType: {
        type: String,
        default: null,
      },
      mode: {
        type: String,
        default: 'view',
        validator: val => ['view', 'edit'].includes(val),
      },
      /** Whether to highlight correct answers in view mode (showAnswers toggle). */
      showAnswers: {
        type: Boolean,
        default: false,
      },
    },

    computed: {
      buttonAppearanceOverrides() {
        return {
          backgroundColor: this.$themePalette.blue.v_50,
          border: `1px dashed ${this.$themePalette.blue.v_200}`,
          color: `${this.$themePalette.blue.v_500} !important`,
          fontSize: '14px',
          fontWeight: '600',
          textTransform: 'none',
          ':hover': {
            backgroundColor: this.$themePalette.blue.v_100,
          },
        };
      },
    },

    emits: ['update:bodyXml', 'update:responseDeclarations'],
  };

</script>


<style lang="scss" scoped>

  .choice-editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field-label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
  }

  .answers-label {
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 600;
  }

  .choice-editor__section {
    display: flex;
    flex-direction: column;
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

  .answer-card-text {
    padding: 7.5px;

    &.is-closed {
      min-height: 42px;
      padding-top: 0;
      padding-bottom: 0;

      .small-screen & {
        min-height: 36px;
      }
    }
  }

  /* Flex row: [selection] [content] [actions] */
  .answer-layout {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &.is-open {
      align-items: flex-start;
    }

    &.small-screen {
      &.is-open {
        flex-wrap: wrap;
        align-items: center;

        .answer-selection {
          flex: 0 0 auto;
          order: 0;
          margin-bottom: 4px;
        }

        .answer-actions {
          flex: 0 0 auto;
          order: 1;
          margin-bottom: 4px;
        }

        .answer-content {
          flex: 0 0 100%;
          order: 2;
          min-width: 0;
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
    overflow: hidden;
  }

  .answer-actions {
    display: flex;
    flex-shrink: 0;
    gap: 2px;
    align-items: center;
    margin-left: 16px;
  }

  /* Fill parent — same as AnswersEditor .editor */
  .editor {
    width: 100%;
  }

  /* Prompt wrapper */
  .choice-editor__prompt-wrap {
    padding: 4px 0;
  }

  .answer-border.is-clickable {
    cursor: pointer;
  }

  /* Add choice button */
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
