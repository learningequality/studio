<template>

  <div class="choice-editor">
    <Teleport
      v-if="mode === 'edit' && teleportTargetId"
      :to="`#${teleportTargetId}`"
    >
      <AnswerSettings
        :questionType="questionType"
        :shuffle="state.shuffle"
        :showAnswerCount="state.showAnswerCount"
        @update:shuffle="setShuffle"
        @update:showAnswerCount="setShowAnswerCount"
      />
    </Teleport>

    <!-- Prompt -->
    <div class="choice-editor__section">
      <ValidationMessage v-if="questionHasError">
        {{ errorPromptRequired$() }}
      </ValidationMessage>
      <div
        class="field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ questionLabel$() }}
      </div>

      <!-- Prompt -->
      <ClickableRegion
        :class="getPromptWrapperClass()"
        :style="promptWrapperStyle"
        :suppressed="mode !== 'edit' || isQuestionOpen"
        :aria-label="editQuestionLabel$()"
        @click="handlePromptClick"
      >
        <div class="choice-card-text is-closed">
          <div class="choice-layout">
            <div class="choice-content">
              <TipTapEditor
                :value="state.prompt"
                :mode="isQuestionOpen ? mode : 'view'"
                format="html"
                :minHeight="'80px'"
                :autofocus="mode === 'edit' && isQuestionOpen"
                :imageProcessor="EditorImageProcessor"
                :tabindex="-1"
                class="editor"
                @update="setPrompt"
                @minimize="closeQuestion"
              />
            </div>
          </div>
        </div>
      </ClickableRegion>
    </div>

    <!-- Choice list -->
    <div
      v-if="mode === 'edit' || showAnswers"
      class="choice-editor__section"
    >
      <ValidationMessage v-if="noCorrectAnswerError">
        {{ errorNoCorrectAnswer$() }}
      </ValidationMessage>
      <ValidationMessage v-if="tooManyCorrectError">
        {{ errorTooManyCorrectAnswers$() }}
      </ValidationMessage>
      <div
        :id="answersHeaderId"
        class="answers-header field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ answersLabel$() }}
      </div>
      <div
        v-if="mode === 'edit'"
        class="choices-label"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ answersDescription }}
      </div>

      <component
        :is="isSingleSelect ? 'KRadioButtonGroup' : 'div'"
        class="choices-list"
        :aria-labelledby="answersHeaderId"
        :role="!isSingleSelect ? 'group' : undefined"
      >
        <div
          v-for="(choice, index) in state.choices"
          :key="choice.id"
          class="choice-group"
        >
          <!-- Bordered choice card -->
          <ClickableRegion
            class="choice-border"
            :class="getChoiceClasses(choice)"
            :style="getChoiceStyle(choice)"
            :suppressed="mode !== 'edit' || isChoiceOpen(choice.id)"
            :aria-label="editAnswerOptionLabel$({ number: index + 1 })"
            @click="handleChoiceClick(choice.id)"
          >
            <div
              class="choice-card-text"
              :class="{
                'is-closed': isChoiceClosed(choice.id),
                'small-screen': windowIsSmall,
              }"
            >
              <div
                class="choice-layout"
                :class="{
                  'is-open': isChoiceOpen(choice.id),
                  'small-screen': windowIsSmall,
                }"
              >
                <!-- Selection control -->
                <div
                  class="choice-selection"
                  @click.stop
                >
                  <KIcon
                    v-if="choiceHasError(choice.id)"
                    icon="error"
                    :color="$themeTokens.error"
                    :style="{ width: '20px', height: '20px', marginTop: '2px', marginRight: '4px' }"
                  />
                  <KRadioButton
                    v-if="isSingleSelect"
                    :currentValue="correctChoiceId || ''"
                    :buttonValue="choice.id"
                    :label="markCorrectLabel$()"
                    :showLabel="false"
                    :disabled="mode !== 'edit'"
                    :style="{ width: 'auto' }"
                    :color="$themePalette.green.v_600"
                    @change="onToggleCorrect(choice.id)"
                  />
                  <!-- KCheckbox color prop colors the checked icon green -->
                  <KCheckbox
                    v-else
                    :checked="choice.correct"
                    :label="markCorrectLabel$()"
                    :showLabel="false"
                    :disabled="mode !== 'edit'"
                    :color="$themePalette.green.v_600"
                    @change="onToggleCorrect(choice.id)"
                  />
                </div>

                <div class="choice-content">
                  <TipTapEditor
                    :value="choice.content"
                    :mode="isChoiceOpen(choice.id) ? 'edit' : 'view'"
                    format="html"
                    :minHeight="'80px'"
                    :autofocus="isChoiceOpen(choice.id)"
                    :imageProcessor="EditorImageProcessor"
                    :tabindex="-1"
                    class="editor"
                    @update="html => setChoiceContent(choice.id, html)"
                    @minimize="closeChoice"
                  />
                </div>

                <!-- Actions toolbar -->
                <div
                  v-if="mode === 'edit'"
                  class="choice-actions toolbar"
                  @click.stop
                >
                  <CollapsibleToolbar :actions="getChoiceRowActions(choice.id, index)" />
                </div>
              </div>
            </div>
            <!-- Per-choice validation messages sit INSIDE the bordered card -->
            <ValidationMessage
              v-if="emptyChoiceIds.has(choice.id)"
              class="choice-validation-message"
            >
              {{ errorEmptyChoiceContent$() }}
            </ValidationMessage>
            <ValidationMessage
              v-if="duplicateChoiceIds.has(choice.id)"
              class="choice-validation-message"
            >
              {{ errorDuplicateChoiceContent$() }}
            </ValidationMessage>
          </ClickableRegion>
        </div>
      </component>

      <!-- Add choice button (edit only) -->
      <AddListItemButton
        v-if="mode === 'edit'"
        :label="addChoiceBtn$()"
        :aria-label="addChoiceBtn$()"
        @click="onAddChoice"
      />
    </div>
  </div>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import Teleport from 'vue2-teleport';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { ValidationError } from '../../constants';
  import { generateRandomSlug } from '../../utils/generateRandomSlug';
  import { useChoiceInteraction } from '../../composables/useChoiceInteraction';
  import CollapsibleToolbar from '../../components/CollapsibleToolbar/index.vue';
  import ValidationMessage from '../../components/ValidationMessage/index.vue';
  import AddListItemButton from '../../components/AddListItemButton/index.vue';
  import ClickableRegion from '../../components/ClickableRegion/index.vue';
  import AnswerSettings from './components/AnswerSettings/index.vue';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  export default {
    name: 'ChoiceInteractionEditor',

    components: {
      ClickableRegion,
      TipTapEditor,
      CollapsibleToolbar,
      ValidationMessage,
      AddListItemButton,
      AnswerSettings,
      Teleport,
    },

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
        errorDuplicateChoiceContent$,
        questionLabel$,
        answersLabel$,
        answersDescriptionSingleChoice$,
        answersDescriptionMultipleChoice$,
        editQuestionLabel$,
        editAnswerOptionLabel$,
      } = qtiEditorStrings;

      const palette = themePalette();
      const tokens = themeTokens();

      // questionType prop is not a Ref — wrap it so useChoiceInteraction can react to changes.
      const questionTypeRef = computed(() => props.questionType);

      const {
        state,
        bodyXml,
        responseDeclarations,
        errors,
        isSingleSelect,
        addChoice,
        removeChoice,
        moveChoiceUp,
        moveChoiceDown,
        toggleCorrectChoice,
        setPrompt,
        setChoiceContent,
        setShuffle,
        setShowAnswerCount,
      } = useChoiceInteraction(props.interaction, questionTypeRef);

      const isQuestionOpen = ref(false);
      const openChoiceId = ref(null);

      function openQuestion() {
        isQuestionOpen.value = true;
        openChoiceId.value = null;
      }

      function handlePromptClick() {
        if (props.mode !== 'edit') return;
        if (!isQuestionOpen.value) {
          openQuestion();
        }
      }

      function handleChoiceClick(choiceId) {
        if (props.mode !== 'edit') return;
        if (openChoiceId.value === choiceId) return;
        openChoice(choiceId);
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
            } else if (state.value.choices.length > 0) {
              openChoice(state.value.choices[0].id);
            }
          } else {
            isQuestionOpen.value = false;
            openChoiceId.value = null;
          }
        },
        { immediate: true },
      );

      const workingInteraction = computed(() => ({
        bodyXml: bodyXml.value,
        responseDeclarations: responseDeclarations.value,
      }));
      watch(workingInteraction, newVal => emit('update:interaction', newVal), { immediate: true });

      // Errors are reported the same way, for the card to show that the question needs work.
      watch(errors, newVal => emit('update:errors', newVal), { immediate: true });

      const answersDescription = computed(() =>
        isSingleSelect.value
          ? answersDescriptionSingleChoice$()
          : answersDescriptionMultipleChoice$(),
      );

      const correctChoiceId = computed(() => state.value.choices.find(a => a.correct)?.id ?? null);

      const errorCodes = computed(() => errors.value.map(e => e.code));
      const emptyChoiceIds = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.EMPTY_CHOICE_CONTENT)
              .map(e => e.id),
          ),
      );

      const duplicateChoiceIds = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.DUPLICATE_CHOICE_CONTENT)
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
      function onToggleCorrect(id) {
        toggleCorrectChoice(id);
      }

      function onAddChoice() {
        addChoice();
        const newChoiceId = state.value.choices[state.value.choices.length - 1]?.id;
        if (newChoiceId) {
          openChoice(newChoiceId);
        }
      }

      function onRemoveChoice(id) {
        removeChoice(id);
        if (openChoiceId.value === id) {
          openChoiceId.value = null;
        }
      }

      function getChoiceRowActions(answerId, index) {
        return [
          {
            id: 'up',
            icon: 'chevronUp',
            label: moveChoiceUpBtn$(),
            disabled: index === 0,
            handler: () => moveChoiceUp(answerId),
            collapsed: windowIsSmall.value,
          },
          {
            id: 'down',
            icon: 'chevronDown',
            label: moveChoiceDownBtn$(),
            disabled: index === state.value.choices.length - 1,
            handler: () => moveChoiceDown(answerId),
            collapsed: windowIsSmall.value,
          },
          {
            id: 'delete',
            icon: 'close',
            label: deleteChoiceBtn$(),
            disabled: state.value.choices.length <= 1,
            handler: () => onRemoveChoice(answerId),
            collapsed: windowIsSmall.value,
          },
        ];
      }

      const isPromptEditing = computed(() => props.mode === 'edit' && isQuestionOpen.value);

      function getPromptWrapperClass() {
        if (isPromptEditing.value) {
          return 'choice-editor__prompt-wrap';
        }
        return ['choice-border', { 'is-clickable': props.mode === 'edit' }];
      }

      const promptWrapperStyle = computed(() => {
        if (isPromptEditing.value) {
          return {};
        }
        return {
          borderColor: questionHasError.value ? tokens.error : tokens.fineLine,
        };
      });

      function isChoiceClosed(id) {
        return props.mode !== 'edit' || openChoiceId.value !== id;
      }

      function choiceHasError(id) {
        return emptyChoiceIds.value.has(id) || duplicateChoiceIds.value.has(id);
      }

      function isChoiceOpen(id) {
        return props.mode === 'edit' && openChoiceId.value === id;
      }

      function getChoiceClasses(choice) {
        return {
          'is-clickable': props.mode === 'edit' && isChoiceClosed(choice.id),
        };
      }

      function getChoiceStyle(choice) {
        const isCorrect = choice.correct && (props.mode === 'edit' || props.showAnswers);
        const hasError = choiceHasError(choice.id);

        let borderColor = tokens.fineLine;
        if (hasError) {
          borderColor = tokens.error;
        } else if (isCorrect) {
          borderColor = palette.green.v_500;
        }

        const hoverBg = isCorrect ? palette.green.v_100 : tokens.fineLine;

        return {
          borderColor,
          backgroundColor: isCorrect ? palette.green.v_50 : null,
          '--clickable-region-hover-bg': hoverBg,
        };
      }

      const answersHeaderId = generateRandomSlug('answers-header');

      return {
        EditorImageProcessor,
        getPromptWrapperClass,
        promptWrapperStyle,
        state,
        isSingleSelect,
        windowIsSmall,
        answersLabel$,
        answersDescription,
        answersHeaderId,
        isQuestionOpen,
        closeQuestion,
        closeChoice,
        correctChoiceId,
        questionHasError,
        noCorrectAnswerError,
        tooManyCorrectError,
        emptyChoiceIds,
        duplicateChoiceIds,
        choiceHasError,
        setPrompt,
        setChoiceContent,
        setShuffle,
        setShowAnswerCount,
        onToggleCorrect,
        onAddChoice,
        getChoiceRowActions,
        isChoiceClosed,
        isChoiceOpen,
        getChoiceClasses,
        getChoiceStyle,
        handlePromptClick,
        handleChoiceClick,
        addChoiceBtn$,
        markCorrectLabel$,
        errorPromptRequired$,
        errorNoCorrectAnswer$,
        errorTooManyCorrectAnswers$,
        errorEmptyChoiceContent$,
        errorDuplicateChoiceContent$,
        questionLabel$,
        editQuestionLabel$,
        editAnswerOptionLabel$,
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
      /** Whether to display correct answers (used in view mode previews) */
      showAnswers: {
        type: Boolean,
        default: false,
      },
      teleportTargetId: {
        type: String,
        required: true,
      },
    },

    emits: ['update:interaction', 'update:errors'],
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

  .answers-header {
    margin-bottom: 2px;
  }

  .choices-label {
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 400;
  }

  .choice-editor__section {
    display: flex;
    flex-direction: column;
  }

  .choices-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    margin: 0;
  }

  /* Groups the bordered card with its per-choice error messages */
  .choice-group {
    display: flex;
    flex-direction: column;
  }

  .choice-border {
    position: relative;
    border: 1px solid;
    border-radius: 4px;
    transition: background-color 0.3s;
  }

  .choice-card-text {
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

  .choice-validation-message {
    padding: 7.5px;
  }

  /* Flex row: [selection] [content] [actions] */
  .choice-layout {
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

        .choice-selection {
          flex: 0 0 auto;
          order: 0;
          margin-bottom: 4px;
        }

        .choice-actions {
          flex: 0 0 auto;
          order: 1;
          margin-bottom: 4px;
        }

        .choice-content {
          flex: 0 0 100%;
          order: 2;
          min-width: 0;
        }
      }
    }
  }

  .choice-selection {
    flex-shrink: 0;
    margin-right: 16px;

    .small-screen & {
      margin-right: 6px;
    }
  }

  .choice-content {
    position: relative;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .choice-actions {
    display: flex;
    flex-shrink: 0;
    gap: 2px;
    align-items: center;
    margin-left: 16px;
  }

  .editor {
    width: 100%;
  }

  .choice-editor__prompt-wrap {
    position: relative;
    padding: 4px 0;

    .choice-card-text.is-closed {
      min-height: auto;
      padding: 0;
    }

    .choice-layout {
      display: block;
    }
  }

  .choice-border.is-clickable {
    cursor: pointer;

    &:hover {
      background-color: var(--clickable-region-hover-bg, v-bind('$themeTokens.fineLine'));
    }
  }

</style>
