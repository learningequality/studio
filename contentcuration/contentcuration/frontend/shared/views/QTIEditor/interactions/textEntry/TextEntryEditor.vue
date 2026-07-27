<template>

  <div class="text-entry-editor">
    <!-- Prompt -->
    <div class="text-entry-editor__section">
      <ValidationMessage v-if="questionHasError">
        {{ errorPromptRequired$() }}
      </ValidationMessage>
      <div
        class="field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ questionLabel$() }}
      </div>

      <div
        :class="promptWrapperClass"
        :style="promptWrapperStyle"
        @click="handlePromptClick"
      >
        <TipTapEditor
          :value="state.prompt"
          :mode="isPromptOpen ? mode : 'view'"
          format="html"
          :minHeight="'80px'"
          :autofocus="mode === 'edit' && isPromptOpen"
          :imageProcessor="EditorImageProcessor"
          class="editor"
          @update="setPrompt"
          @minimize="closePrompt"
        />
      </div>
    </div>

    <!-- Acceptable answers (numeric and textEntry only) -->
    <div
      v-if="showAnswerSection && (mode === 'edit' || showAnswers)"
      class="text-entry-editor__section"
    >
      <ValidationMessage v-if="noCorrectAnswerError">
        {{ errorNoCorrectAnswer$() }}
      </ValidationMessage>

      <div
        class="field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ acceptableAnswersLabel$() }}
      </div>
      <div
        class="answers-description"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ isNumeric ? acceptableAnswersDescription$() : acceptableAnswersDescriptionTextEntry$() }}
      </div>

      <div class="answers-list">
        <div
          v-for="answer in state.answers"
          :key="answer.id"
          class="answer-group"
        >
          <div
            class="answer-border"
            :class="{ 'has-error': answerHasError(answer.id) }"
          >
            <div
              class="answer-layout"
              :class="{ 'small-screen': windowIsSmall }"
            >
              <div class="answer-input-wrap">
                <input
                  :id="`answer-input-${answer.id}`"
                  :ref="el => setAnswerInputRef(answer.id, el)"
                  :value="answer.value"
                  :placeholder="isNumeric ? answerValuePlaceholder$() : answerTextPlaceholder$()"
                  class="answer-native-input"
                  dir="auto"
                  maxlength="250"
                  :style="{
                    color: $themeTokens.text,
                  }"
                  @input="e => onAnswerInput(answer.id, e.target.value)"
                  @blur="runValidation"
                >
              </div>

              <div
                class="answer-actions"
                @click.stop
              >
                <div
                  v-if="!isNumeric"
                  class="checkbox-wrapper"
                >
                  <KCheckbox
                    :id="`case-sensitive-${answer.id}`"
                    :checked="answer.caseSensitive"
                    :label="caseSensitiveLabel$()"
                    class="case-sensitive-check"
                    :style="{ color: $themePalette.grey.v_700 }"
                    @change="onToggleCaseSensitive(answer.id)"
                  />
                </div>
                <KIconButton
                  icon="close"
                  :tooltip="deleteAnswerBtn$()"
                  :ariaLabel="deleteAnswerBtn$()"
                  :disabled="state.answers.length <= 1"
                  :color="
                    state.answers.length <= 1 ? $themeTokens.textDisabled : $themePalette.grey.v_800
                  "
                  size="small"
                  @click="onRemoveAnswer(answer.id)"
                />
              </div>
            </div>

            <ValidationMessage
              v-if="isNumeric && answerHasError(answer.id, ValidationError.INVALID_NUMERIC_VALUE)"
              class="answer-validation-message"
            >
              {{ errorInvalidNumericValue$() }}
            </ValidationMessage>

            <ValidationMessage
              v-if="!isNumeric && answerHasError(answer.id, ValidationError.EMPTY_ANSWER_CONTENT)"
              class="answer-validation-message"
            >
              {{ errorEmptyAnswerContent$() }}
            </ValidationMessage>

            <ValidationMessage
              v-if="answerHasError(answer.id, ValidationError.DUPLICATE_ANSWER_CONTENT)"
              class="answer-validation-message"
            >
              {{ errorDuplicateAnswerContent$() }}
            </ValidationMessage>
          </div>
        </div>
      </div>

      <AddListItemButton
        v-if="mode === 'edit'"
        :label="addAnswerBtn$()"
        :aria-label="addAnswerBtn$()"
        @click="onAddAnswer"
      />
    </div>
  </div>

</template>


<script>

  import { computed, ref, watch, nextTick } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { QuestionType, ValidationError } from '../../constants';
  import { useTextEntryInteraction } from '../../composables/useTextEntryInteraction';
  import ValidationMessage from 'shared/views/QTIEditor/components/ValidationMessage';
  import AddListItemButton from 'shared/views/QTIEditor/components/AddListItemButton';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';

  export default {
    name: 'TextEntryEditor',

    components: { TipTapEditor, ValidationMessage, AddListItemButton },

    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();

      const {
        questionLabel$,
        acceptableAnswersLabel$,
        acceptableAnswersDescription$,
        acceptableAnswersDescriptionTextEntry$,
        addAnswerBtn$,
        deleteAnswerBtn$,
        answerValuePlaceholder$,
        answerTextPlaceholder$,
        caseSensitiveLabel$,
        errorPromptRequired$,
        errorNoCorrectAnswer$,
        errorInvalidNumericValue$,
        errorEmptyAnswerContent$,
        errorDuplicateAnswerContent$,
      } = qtiEditorStrings;

      const tokens = themeTokens();

      const questionTypeRef = computed(() => props.questionType);

      const {
        state,
        errors,
        runValidation,
        bodyXml: composableBodyXml,
        responseDeclarations: composableDeclarations,
        setPrompt,
        addAnswer,
        removeAnswer,
        updateAnswerValue,
        toggleCaseSensitive,
      } = useTextEntryInteraction(props.interaction, questionTypeRef);

      const isNumeric = computed(() => props.questionType === QuestionType.NUMERIC);

      const showAnswerSection = computed(
        () =>
          props.questionType === QuestionType.NUMERIC ||
          props.questionType === QuestionType.TEXT_ENTRY,
      );

      // Prompt open/close state
      const isPromptOpen = ref(false);

      function openPrompt() {
        isPromptOpen.value = true;
      }

      function closePrompt() {
        isPromptOpen.value = false;
        runValidation();
      }

      function handlePromptClick(event) {
        if (props.mode !== 'edit') return;
        if (event.target.closest('button') || event.target.closest('input')) return;
        if (!isPromptOpen.value) {
          event.stopPropagation();
          openPrompt();
        }
      }

      watch(
        () => props.mode,
        newMode => {
          if (newMode === 'edit') {
            if (!state.value.prompt || !state.value.prompt.trim()) {
              openPrompt();
            }
          } else {
            isPromptOpen.value = false;
          }
        },
        { immediate: true },
      );

      // Prompt wrapper class/style
      const promptWrapperClass = computed(() =>
        isPromptOpen.value ? 'prompt-open-wrap' : 'answer-border',
      );

      const promptWrapperStyle = computed(() => {
        if (isPromptOpen.value) return {};
        const hasError = errors.value.some(e => e.code === ValidationError.PROMPT_REQUIRED);
        return {
          borderColor: hasError ? tokens.error : tokens.fineLine,
          cursor: props.mode === 'edit' ? 'pointer' : undefined,
        };
      });

      // Error sets
      const questionHasError = computed(() =>
        errors.value.some(e => e.code === ValidationError.PROMPT_REQUIRED),
      );

      const noCorrectAnswerError = computed(() =>
        errors.value.some(e => e.code === ValidationError.NO_CORRECT_ANSWER),
      );

      const invalidAnswerMap = computed(() => {
        const map = new Map();
        for (const e of errors.value) {
          if (
            e.code === ValidationError.INVALID_NUMERIC_VALUE ||
            e.code === ValidationError.EMPTY_ANSWER_CONTENT ||
            e.code === ValidationError.DUPLICATE_ANSWER_CONTENT
          ) {
            if (!map.has(e.id)) map.set(e.id, new Set());
            map.get(e.id).add(e.code);
          }
        }
        return map;
      });

      function answerHasError(id, specificCode = null) {
        if (!invalidAnswerMap.value.has(id)) return false;
        if (specificCode) return invalidAnswerMap.value.get(id).has(specificCode);
        return true;
      }

      // Mutations
      function onAnswerInput(id, value) {
        updateAnswerValue(id, value);
      }

      // Map of answer id -> input DOM element for focusing
      const answerInputRefs = ref({});

      function setAnswerInputRef(id, el) {
        if (el) {
          answerInputRefs.value[id] = el;
        } else {
          delete answerInputRefs.value[id];
        }
      }

      async function onAddAnswer() {
        const newId = addAnswer();
        await nextTick();
        const input = answerInputRefs.value[newId];
        if (input) input.focus();
      }

      function onRemoveAnswer(id) {
        removeAnswer(id);
        runValidation();
      }

      function onToggleCaseSensitive(id) {
        toggleCaseSensitive(id);
      }

      // Emit bodyXml and responseDeclarations whenever either changes.
      const workingInteraction = computed(() => ({
        bodyXml: composableBodyXml.value,
        responseDeclarations: composableDeclarations.value,
      }));
      watch(
        workingInteraction,
        newVal => {
          if (!newVal.bodyXml) return;
          emit('update:interaction', newVal);
        },
        { immediate: true },
      );

      return {
        state,
        windowIsSmall,
        isNumeric,
        showAnswerSection,
        isPromptOpen,
        promptWrapperClass,
        promptWrapperStyle,
        questionHasError,
        noCorrectAnswerError,
        answerHasError,
        runValidation,
        handlePromptClick,
        closePrompt,
        setPrompt,
        onAnswerInput,
        onAddAnswer,
        onRemoveAnswer,
        onToggleCaseSensitive,
        EditorImageProcessor,
        questionLabel$,
        acceptableAnswersLabel$,
        acceptableAnswersDescription$,
        acceptableAnswersDescriptionTextEntry$,
        addAnswerBtn$,
        deleteAnswerBtn$,
        answerValuePlaceholder$,
        answerTextPlaceholder$,
        caseSensitiveLabel$,
        errorPromptRequired$,
        errorNoCorrectAnswer$,
        errorInvalidNumericValue$,
        errorEmptyAnswerContent$,
        errorDuplicateAnswerContent$,
        ValidationError,
        setAnswerInputRef,
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
      /** Whether to display correct answers in view mode */
      showAnswers: {
        type: Boolean,
        default: false,
      },
    },

    emits: ['update:interaction'],
  };

</script>


<style lang="scss" scoped>

  .text-entry-editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .text-entry-editor__section {
    display: flex;
    flex-direction: column;
  }

  .field-label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
  }

  .answers-description {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 400;
  }

  /* Bordered answer card */
  .answer-border {
    border: 1px solid v-bind('$themeTokens.fineLine');
    border-radius: 4px;
    transition:
      background-color 0.3s,
      border-color 0.3s;

    &:not(.has-error):hover,
    &:not(.has-error):focus-within {
      border-color: v-bind('$themeTokens.primaryDark');
    }

    &.has-error {
      border-color: v-bind('$themeTokens.error');
    }
  }

  /* Prompt card when open */
  .prompt-open-wrap {
    position: relative;
    padding: 4px 0;
  }

  /* Flex row: [input] [actions] — wraps on small screens */
  .answer-layout {
    display: flex;
    gap: 4px;
    align-items: center;
    min-height: 45px;
    padding: 0 4px 0 8px;

    &.small-screen {
      flex-wrap: wrap;
      align-items: flex-start;
      padding-top: 6px;
      padding-bottom: 6px;

      .answer-input-wrap {
        flex: 0 0 100%;
        order: 0;
      }

      .answer-actions {
        flex: 0 0 100%;
        justify-content: flex-end;
        order: 1;
        padding-bottom: 2px;
      }
    }
  }

  .answer-input-wrap {
    flex: 1;
    min-width: 0;
  }

  .answer-native-input {
    width: 100%;
    padding: 8px 4px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    background: transparent;
    border: 0;
    outline: none;

    &::placeholder {
      color: v-bind('$themeTokens.annotation');
      opacity: 1;
    }
  }

  /* Actions cluster: case-sensitive checkbox + delete icon */
  .answer-actions {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
  }

  .checkbox-wrapper {
    display: flex;
    align-items: center;
  }

  .case-sensitive-check {
    flex-shrink: 0;
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  /* Per-answer validation message sits inside the bordered card */
  .answer-validation-message {
    padding: 0 8px 6px;
  }

  .answers-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .editor {
    width: 100%;
  }

</style>
