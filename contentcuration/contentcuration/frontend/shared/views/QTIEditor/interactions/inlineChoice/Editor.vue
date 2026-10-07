<template>

  <div class="inline-choice-editor">
    <Teleport
      v-if="mode === 'edit' && teleportTargetId"
      :to="`#${teleportTargetId}`"
    >
      <AnswerSettings
        ref="answerSettings"
        :questionType="questionType"
        :shuffle="state.shuffle"
        @update:shuffle="setShuffle"
      />
    </Teleport>

    <!-- Question (optional) -->
    <div
      v-if="mode === 'edit' || hasPrompt"
      class="inline-choice-editor__section"
    >
      <h4
        class="field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ mode === 'edit' ? questionOptionalLabel$() : questionLabel$() }}
      </h4>
      <ClickableRegion
        :class="[
          isPromptOpen ? 'open-wrap' : 'field-border',
          { 'is-clickable': mode === 'edit' && !isPromptOpen },
        ]"
        :suppressed="mode !== 'edit' || isPromptOpen"
        :aria-label="editQuestionLabel$()"
        @click="openPrompt"
      >
        <TipTapEditor
          :value="state.prompt"
          :mode="isPromptOpen ? mode : 'view'"
          format="html"
          :minHeight="'80px'"
          :autofocus="mode === 'edit' && isPromptOpen"
          :imageProcessor="EditorImageProcessor"
          :tabindex="-1"
          class="editor"
          @update="setPrompt"
          @minimize="isPromptOpen = false"
        />
      </ClickableRegion>
    </div>

    <!-- Passage -->
    <div class="inline-choice-editor__section">
      <ValidationMessage v-if="hasDropdownErrors">
        {{ errorInlineChoiceOptionProblems$() }}
      </ValidationMessage>
      <ValidationMessage v-if="hasNoDropdown">
        {{ errorNoInlineChoice$() }}
      </ValidationMessage>
      <h4
        class="field-label"
        :class="{ 'field-label--described': mode === 'edit' }"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ mode === 'edit' ? passageEditorLabel$() : passageLabel$() }}
      </h4>
      <div
        v-if="mode === 'edit'"
        :id="passageDescriptionId"
        class="field-description"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ passageEditorDescription$() }}
      </div>
      <ClickableRegion
        :class="[
          isPassageOpen ? 'open-wrap' : 'field-border',
          {
            'has-error': !isPassageOpen && hasNoDropdown,
            'is-clickable': mode === 'edit' && !isPassageOpen,
          },
        ]"
        :suppressed="mode !== 'edit' || isPassageOpen"
        :aria-label="editPassageLabel$()"
        @click="openPassage"
      >
        <TipTapEditor
          :value="state.passage"
          :mode="isPassageOpen ? mode : 'view'"
          format="html"
          :minHeight="'80px'"
          :autofocus="mode === 'edit' && isPassageOpen"
          :imageProcessor="EditorImageProcessor"
          :extensions="passage.extensions"
          :insertActions="passage.insertActions"
          :tabindex="-1"
          class="editor"
          @update="setPassage"
          @minimize="onPassageMinimize"
        />
      </ClickableRegion>
    </div>

    <!-- The open chip's options. The passage editor stays open while they are used: it does
         not close on a click outside it while a chip's popup is expanded. Another chip's are
         another dialog, which a screen reader names as focus enters it. -->
    <div
      v-if="openDropdown"
      ref="optionsWrapper"
    >
      <InlineChoiceOptions
        :key="openDropdown.responseIdentifier"
        ref="options"
        :dropdown="openDropdown"
        :number="openDropdownNumber"
        :reorderable="!state.shuffle"
        :errors="errors"
        @update="change => passage.updateDropdown(openDropdown.responseIdentifier, change)"
        @undo="passage.undo"
        @redo="passage.redo"
        @close="closeOptions"
      />
    </div>
  </div>

</template>


<script>

  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
  import Teleport from 'vue2-teleport';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { ValidationError } from '../../constants';
  import { useInlineChoiceInteraction } from '../../composables/useInlineChoiceInteraction';
  import ValidationMessage from '../../components/ValidationMessage/index.vue';
  import ClickableRegion from '../../components/ClickableRegion/index.vue';
  import AnswerSettings from '../choice/components/AnswerSettings/index.vue';
  import { hasRichTextContent } from '../../utils/richText';
  import { generateRandomSlug } from '../../utils/generateRandomSlug';
  import { useInlineChoicePassage } from './useInlineChoicePassage';
  import InlineChoiceOptions from './components/InlineChoiceOptions/index.vue';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  export default {
    name: 'InlineChoiceEditor',

    components: {
      AnswerSettings,
      ClickableRegion,
      InlineChoiceOptions,
      Teleport,
      TipTapEditor,
      ValidationMessage,
    },

    setup(props, { emit }) {
      const {
        questionOptionalLabel$,
        questionLabel$,
        passageLabel$,
        editQuestionLabel$,
        passageEditorLabel$,
        passageEditorDescription$,
        editPassageLabel$,
        errorInlineChoiceOptionProblems$,
        errorNoInlineChoice$,
      } = qtiEditorStrings;

      const questionTypeRef = computed(() => props.questionType);

      const {
        state,
        bodyXml,
        responseDeclarations,
        errors,
        dropdowns,
        setPrompt,
        setPassage,
        setShuffle,
      } = useInlineChoiceInteraction(props.interaction, questionTypeRef);

      // Each error names an option, a dropdown or nothing; a chip shows those of its own.
      const errorResponseIdentifiers = computed(() => {
        const ids = new Set(errors.value.map(e => e.id));
        return dropdowns.value
          .filter(d => ids.has(d.responseIdentifier) || d.options.some(o => ids.has(o.id)))
          .map(d => d.responseIdentifier);
      });

      const passageDescriptionId = generateRandomSlug('passage-description');
      const passage = useInlineChoicePassage({
        errorResponseIdentifiers,
        // An author editing the question sees its answers, even in the closed passage.
        showAnswers: computed(() => props.mode === 'edit' || props.showAnswers),
        describedBy: passageDescriptionId,
        onChange: setPassage,
      });

      const hasPrompt = computed(() => hasRichTextContent(state.value.prompt));
      const hasDropdownErrors = computed(() => errorResponseIdentifiers.value.length > 0);
      const hasNoDropdown = computed(() =>
        errors.value.some(e => e.code === ValidationError.NO_INTERACTION),
      );

      const isPromptOpen = ref(false);
      const isPassageOpen = ref(false);

      function openPrompt() {
        if (props.mode !== 'edit') return;
        isPromptOpen.value = true;
        isPassageOpen.value = false;
        passage.openDropdown(null);
      }

      function openPassage() {
        if (props.mode !== 'edit') return;
        isPassageOpen.value = true;
        isPromptOpen.value = false;
      }

      function onPassageMinimize() {
        isPassageOpen.value = false;
        passage.openDropdown(null);
      }

      watch(
        () => props.mode,
        newMode => {
          if (newMode === 'edit') {
            // Open the question, the first thing in the card, so the card opens at its start.
            openPrompt();
          } else {
            isPromptOpen.value = false;
            isPassageOpen.value = false;
            passage.openDropdown(null);
          }
        },
        { immediate: true },
      );

      const openDropdownIndex = computed(() =>
        isPassageOpen.value
          ? dropdowns.value.findIndex(
            d => d.responseIdentifier === passage.openResponseIdentifier.value,
          )
          : -1,
      );
      const openDropdown = computed(() => dropdowns.value[openDropdownIndex.value] ?? null);
      const openDropdownNumber = computed(() => openDropdownIndex.value + 1);

      const options = ref(null);
      const optionsWrapper = ref(null);
      const answerSettings = ref(null);

      function closeOptions() {
        passage.openDropdown(null);
      }

      const keepsOptionsOpen = target =>
        [optionsWrapper.value, answerSettings.value?.$el].some(el => el?.contains(target));

      // Where the current press began; a click from the keyboard has none.
      let pressTarget = null;
      function onDocumentPointerdown(event) {
        pressTarget = event.target;
      }

      // Light dismiss: a click anywhere but the panel, or the answer settings that change it,
      // closes it. Not a press, which would unmount the panel and shift the page under it. A
      // press that began in the panel, as a drag of an option, ends in no dismissal.
      function onDocumentClick(event) {
        const startTarget = pressTarget ?? event.target;
        pressTarget = null;
        if (!keepsOptionsOpen(startTarget) && !keepsOptionsOpen(event.target)) closeOptions();
      }

      // Captured, so that clicks stopped on their way up still count.
      function listenForClicks() {
        document.addEventListener('pointerdown', onDocumentPointerdown, true);
        document.addEventListener('click', onDocumentClick, true);
      }

      function stopListeningForClicks() {
        document.removeEventListener('pointerdown', onDocumentPointerdown, true);
        document.removeEventListener('click', onDocumentClick, true);
        pressTarget = null;
      }

      watch(
        () => passage.openResponseIdentifier.value !== null,
        isOpen => (isOpen ? listenForClicks() : stopListeningForClicks()),
      );
      onBeforeUnmount(stopListeningForClicks);

      watch(passage.openResponseIdentifier, async (openId, closedId) => {
        // Read before the panel unmounts.
        const hadFocus = Boolean(optionsWrapper.value?.contains(document.activeElement));
        await nextTick();
        if (openId !== null) {
          // Inserting a chip focuses the passage, which TipTap defers a frame when the passage
          // was not focused, as when Insert is used from the keyboard; it would undo this.
          await new Promise(resolve => requestAnimationFrame(resolve));
          const isStillOpen = passage.openResponseIdentifier.value === openId;
          // Focus already in the panel was put there since, and stays.
          const panelHasFocus = optionsWrapper.value?.contains(document.activeElement);
          if (isStillOpen && !panelHasFocus) options.value?.focusOptions();
        } else if (hadFocus) {
          // Back to the chip, or to the editor when the chip has left the passage.
          passage.focusChip(closedId);
        }
      });

      const workingInteraction = computed(() => ({
        bodyXml: bodyXml.value,
        responseDeclarations: responseDeclarations.value,
      }));
      watch(workingInteraction, newVal => emit('update:interaction', newVal), { immediate: true });

      // Errors are reported the same way, for the card to show that the question needs work.
      watch(errors, newVal => emit('update:errors', newVal), { immediate: true });

      return {
        EditorImageProcessor,
        state,
        errors,
        passage,
        passageDescriptionId,
        hasPrompt,
        hasDropdownErrors,
        hasNoDropdown,
        isPromptOpen,
        isPassageOpen,
        openPrompt,
        openPassage,
        onPassageMinimize,
        openDropdown,
        openDropdownNumber,
        options,
        optionsWrapper,
        answerSettings,
        closeOptions,
        setPrompt,
        setPassage,
        setShuffle,
        questionOptionalLabel$,
        questionLabel$,
        passageLabel$,
        editQuestionLabel$,
        passageEditorLabel$,
        passageEditorDescription$,
        editPassageLabel$,
        errorInlineChoiceOptionProblems$,
        errorNoInlineChoice$,
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

  .inline-choice-editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .inline-choice-editor__section {
    display: flex;
    flex-direction: column;
  }

  /* A heading, so its own margins are set rather than inherited from the UA stylesheet */
  .field-label {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;

    &--described {
      margin-bottom: 2px;
    }
  }

  .field-description {
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 400;
  }

  .field-border {
    border: 1px solid var(--tokens-fineLine);
    border-radius: 4px;
    transition: background-color 0.3s;

    &.has-error {
      border-color: var(--tokens-error);
    }

    &.is-clickable {
      cursor: pointer;

      &:hover {
        background-color: var(--tokens-fineLine);
      }
    }
  }

  .open-wrap {
    position: relative;
    padding: 4px 0;
  }

  .editor {
    width: 100%;
  }

</style>
