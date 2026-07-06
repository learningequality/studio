<template>

  <div class="choice-editor">
    <!-- Prompt -->
    <div class="choice-editor__section">
      <ValidationMessage :show="questionHasError">
        {{ errorPromptRequired$() }}
      </ValidationMessage>
      <div
        class="field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ questionLabel$() }}
      </div>

      <!-- Prompt -->
      <div
        :class="[
          mode === 'edit' && isQuestionOpen ? 'choice-editor__prompt-wrap' : 'choice-border',
        ]"
        :style="[
          mode === 'edit' && isQuestionOpen
            ? {}
            : { borderColor: questionHasError ? $themeTokens.error : $themeTokens.fineLine },
          mode === 'edit' && !isQuestionOpen ? { cursor: 'pointer' } : {},
        ]"
        @click.stop="handlePromptClick"
      >
        <div :class="mode === 'edit' && isQuestionOpen ? '' : 'choice-card-text is-closed'">
          <div :class="mode === 'edit' && isQuestionOpen ? '' : 'choice-layout'">
            <div :class="mode === 'edit' && isQuestionOpen ? '' : 'choice-content'">
              <TipTapEditor
                :value="state.prompt"
                :mode="mode === 'edit' && isQuestionOpen ? 'edit' : 'view'"
                :minHeight="'80px'"
                :autofocus="mode === 'edit' && isQuestionOpen"
                class="editor"
                @update="setPrompt"
                @minimize="closeQuestion"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Choice list -->
    <div
      v-if="mode === 'edit' || showAnswers"
      class="choice-editor__section"
    >
      <ValidationMessage :show="noCorrectAnswerError">
        {{ errorNoCorrectAnswer$() }}
      </ValidationMessage>
      <ValidationMessage :show="tooManyCorrectError">
        {{ errorTooManyCorrectAnswers$() }}
      </ValidationMessage>
      <ValidationMessage :show="tooFewChoicesError">
        {{ errorTooFewChoices$() }}
      </ValidationMessage>

      <div
        class="answers-header field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ answersLabel$() }}
      </div>
      <div
        class="choices-label"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ answersLabel }}
      </div>

      <div class="choices-list">
        <div
          v-for="(choice, index) in state.choices"
          :key="choice.id"
          class="choice-group"
        >
          <!-- Bordered choice card -->
          <div
            class="choice-border"
            :class="getChoiceClasses(choice)"
            :style="getChoiceStyle(choice)"
            @click.stop="handleChoiceClick($event, choice.id)"
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
                  <!-- Error icon replaces selection control when choice has an error -->
                  <KIcon
                    v-if="emptyChoiceIds.has(choice.id) || duplicateChoiceIds.has(choice.id)"
                    icon="error"
                    :color="$themeTokens.error"
                    :style="{ width: '20px', height: '20px', marginTop: '2px' }"
                  />
                  <template v-else>
                    <KRadioButton
                      v-if="isSingleSelect"
                      :currentValue="correctChoiceId"
                      :buttonValue="choice.id"
                      :label="markCorrectLabel$()"
                      :showLabel="false"
                      :aria-label="markCorrectLabel$()"
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
                      :aria-label="markCorrectLabel$()"
                      :disabled="mode !== 'edit'"
                      :color="$themePalette.green.v_600"
                      @change="onToggleCorrect(choice.id)"
                    />
                  </template>
                </div>

                <div class="choice-content">
                  <TipTapEditor
                    :value="choice.content"
                    :mode="isChoiceOpen(choice.id) ? 'edit' : 'view'"
                    :style="isChoiceOpen(choice.id) ? { backgroundColor: $themePalette.white } : {}"
                    :minHeight="'80px'"
                    :autofocus="isChoiceOpen(choice.id)"
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
                  <!-- Large screen: inline up / down / delete -->
                  <template v-if="!windowIsSmall">
                    <KIconButton
                      icon="chevronUp"
                      :aria-label="moveChoiceUpBtn$()"
                      :tooltip="moveChoiceUpBtn$()"
                      :disabled="index === 0"
                      :color="index === 0 ? $themeTokens.textDisabled : $themePalette.grey.v_800"
                      size="small"
                      @click.stop="moveChoiceUp(choice.id)"
                    />
                    <KIconButton
                      icon="chevronDown"
                      :aria-label="moveChoiceDownBtn$()"
                      :tooltip="moveChoiceDownBtn$()"
                      :disabled="index === state.choices.length - 1"
                      :color="
                        index === state.choices.length - 1
                          ? $themeTokens.textDisabled
                          : $themePalette.grey.v_800
                      "
                      size="small"
                      @click.stop="moveChoiceDown(choice.id)"
                    />
                    <KIconButton
                      icon="close"
                      :aria-label="deleteChoiceBtn$()"
                      :tooltip="deleteChoiceBtn$()"
                      :disabled="state.choices.length <= 1"
                      :color="
                        state.choices.length <= 1
                          ? $themeTokens.textDisabled
                          : $themePalette.grey.v_800
                      "
                      size="small"
                      @click.stop="onRemoveChoice(choice.id)"
                    />
                  </template>

                  <!-- Small screen: CollapsibleToolbar dropdown -->
                  <CollapsibleToolbar
                    v-else
                    :actions="getChoiceRowActions(choice.id, index)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Per-choice validation messages sit OUTSIDE the bordered card -->
          <ValidationMessage :show="emptyChoiceIds.has(choice.id)">
            {{ errorEmptyChoiceContent$() }}
          </ValidationMessage>
          <ValidationMessage :show="duplicateChoiceIds.has(choice.id)">
            {{ errorDuplicateChoiceContent$() }}
          </ValidationMessage>
        </div>
      </div>

      <!-- Add choice button (edit only) -->
      <KButton
        v-if="mode === 'edit'"
        appearance="flat-button"
        :appearanceOverrides="buttonAppearanceOverrides"
        class="choice-editor-button"
        :aria-label="addChoiceBtn$()"
        @click="onAddChoice"
      >
        <div class="add-choice-btn-content">
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

  import { computed, ref, watch, getCurrentInstance } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
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
        errorDuplicateChoiceContent$,
        errorTooFewChoices$,
        questionLabel$,
        answersLabel$,
        answersLabelSingleChoice$,
        answersLabelMultipleChoice$,
      } = qtiEditorStrings;

      const palette = themePalette();
      const buttonAppearanceOverrides = computed(() => ({
        backgroundColor: palette.blue.v_50,
        border: `1px dashed ${palette.blue.v_200}`,
        color: `${palette.blue.v_500} !important`,
        fontSize: '14px',
        fontWeight: '600',
        textTransform: 'none',
        ':hover': {
          backgroundColor: palette.blue.v_100,
        },
      }));

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

      /** Handles clicks on the prompt wrapper. Ignores clicks from buttons/inputs
       *  to prevent the TipTap minimize race condition (minimise fires blur → click
       *  on the wrapper re-opens the editor instantly). */
      function handlePromptClick(event) {
        if (props.mode !== 'edit') return;
        if (event.target.closest('button') || event.target.closest('input')) return;
        if (!isQuestionOpen.value) openQuestion();
      }

      /** Handles clicks on choice rows. Ignores clicks from buttons/inputs
       *  to prevent the TipTap minimize race condition (minimize fires blur → click
       *  on the wrapper re-opens the editor instantly). Selection controls and
       *  toolbar actions use @click.stop in the template so they don't reach here. */
      function handleChoiceClick(event, choiceId) {
        if (props.mode !== 'edit') return;
        if (openChoiceId.value === choiceId) return;
        if (event.target.closest('button') || event.target.closest('input')) return;
        openChoiceId.value = choiceId;
      }

      function closeQuestion() {
        isQuestionOpen.value = false;
        runValidation();
      }

      function openChoice(id) {
        openChoiceId.value = id;
        isQuestionOpen.value = false;
      }

      function closeChoice() {
        openChoiceId.value = null;
        runValidation();
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

      // Emit a single unified interaction object whenever either bodyXml or
      // responseDeclarations changes, mirroring the shape of the incoming prop.
      const updatedInteraction = computed(() => ({
        ...props.interaction,
        bodyXml: bodyXml.value,
        responseDeclarations: declarations.value,
      }));
      watch(updatedInteraction, newVal => emit('update:interaction', newVal), { immediate: true });

      const isSingleSelect = computed(() => props.questionType === QuestionType.SINGLE_SELECT);

      const answersLabel = computed(() =>
        isSingleSelect.value ? answersLabelSingleChoice$() : answersLabelMultipleChoice$(),
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
      const tooFewChoicesError = computed(
        () => errors.value.length > 0 && errorCodes.value.includes(ValidationError.TOO_FEW_CHOICES),
      );

      function onToggleCorrect(id) {
        toggleCorrectChoice(id);
      }

      function onAddChoice() {
        addChoice();
        openChoiceId.value = state.value.choices[state.value.choices.length - 1]?.id ?? null;
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
            collapsed: false,
          },
          {
            id: 'down',
            icon: 'chevronDown',
            label: moveChoiceDownBtn$(),
            disabled: index === state.value.choices.length - 1,
            handler: () => moveChoiceDown(answerId),
            collapsed: false,
          },
          {
            id: 'delete',
            icon: 'close',
            label: deleteChoiceBtn$(),
            disabled: state.value.choices.length <= 1,
            handler: () => onRemoveChoice(answerId),
            collapsed: false,
          },
        ];
      }

      const instance = getCurrentInstance();

      function isChoiceClosed(id) {
        return props.mode !== 'edit' || openChoiceId.value !== id;
      }

      function isChoiceOpen(id) {
        return props.mode === 'edit' && openChoiceId.value === id;
      }

      function getChoiceClasses(choice) {
        const closed = isChoiceClosed(choice.id);
        const clickable = props.mode === 'edit' && closed;
        const isCorrect = choice.correct && (props.mode === 'edit' || props.showAnswers);
        const hoverBg = isCorrect
          ? instance.proxy.$themePalette.green.v_100
          : instance.proxy.$themeTokens.fineLine;
        return [
          { 'is-clickable': clickable },
          clickable
            ? instance.proxy.$computedClass({
              ':hover': { backgroundColor: hoverBg },
            })
            : '',
        ];
      }

      function getChoiceStyle(choice) {
        const isCorrect = choice.correct && (props.mode === 'edit' || props.showAnswers);
        const hasError =
          emptyChoiceIds.value.has(choice.id) || duplicateChoiceIds.value.has(choice.id);

        let borderColor = instance.proxy.$themeTokens.fineLine;
        if (hasError) {
          borderColor = instance.proxy.$themeTokens.error;
        } else if (isCorrect) {
          borderColor = instance.proxy.$themePalette.green.v_500;
        }

        return {
          borderColor,
          backgroundColor: isCorrect ? instance.proxy.$themePalette.green.v_50 : null,
        };
      }

      return {
        state,
        isSingleSelect,
        windowIsSmall,
        answersLabel$,
        answersLabel,
        isQuestionOpen,
        closeQuestion,
        closeChoice,
        correctChoiceId,
        questionHasError,
        noCorrectAnswerError,
        tooManyCorrectError,
        tooFewChoicesError,
        emptyChoiceIds,
        duplicateChoiceIds,
        setPrompt,
        setChoiceContent,
        onToggleCorrect,
        onAddChoice,
        onRemoveChoice,
        moveChoiceUp,
        moveChoiceDown,
        getChoiceRowActions,
        isChoiceClosed,
        isChoiceOpen,
        getChoiceClasses,
        getChoiceStyle,
        handlePromptClick,
        handleChoiceClick,
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
        errorTooFewChoices$,
        questionLabel$,
        buttonAppearanceOverrides,
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
    },

    emits: ['update:interaction'],
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
  }

  .choice-border.is-clickable {
    cursor: pointer;
  }

  .choice-editor-button {
    justify-content: center;
    width: 100%;
    padding: 11px 16px !important;
    margin-top: 10px;
    line-height: unset !important;
    border-radius: 4px !important;
  }

  .add-choice-btn-content {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
  }

</style>
