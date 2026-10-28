<template>

  <div class="gap-match-editor">
    <!-- Question (optional). Each section is keyed: TipTapEditor reads its extensions once, so
         Vue must not hand the question's editor to the passage when the question is hidden. -->
    <div
      v-if="mode === 'edit' || hasPrompt"
      key="prompt"
      class="gap-match-editor__section"
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
    <div
      key="passage"
      class="gap-match-editor__section"
    >
      <ValidationMessage
        v-if="hasGapErrors"
        :alert="isGapErrorsAlert"
      >
        {{ errorEmptyGap$() }}
      </ValidationMessage>
      <ValidationMessage
        v-if="hasNoGap"
        :alert="isNoGapAlert"
      >
        {{ errorNoGap$() }}
      </ValidationMessage>
      <h4
        class="field-label"
        :class="{ 'field-label--described': mode === 'edit' }"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ mode === 'edit' ? passageEditorLabel$() : gapMatchAnswersLabel$() }}
      </h4>
      <div
        v-if="mode === 'edit'"
        :id="passageDescriptionId"
        class="field-description"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ gapPassageEditorDescription$() }}
      </div>
      <ClickableRegion
        :class="[
          isPassageOpen ? 'open-wrap' : 'field-border',
          {
            'has-error': !isPassageOpen && (hasNoGap || hasGapErrors),
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
          @minimize="isPassageOpen = false"
        />
      </ClickableRegion>
    </div>

    <!-- Distractors (optional) -->
    <div
      v-if="mode === 'edit'"
      key="distractors"
      class="gap-match-editor__section"
    >
      <h4
        class="field-label field-label--described"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ distractorsLabel$() }}
      </h4>
      <div
        class="field-description"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ distractorsDescription$() }}
      </div>
      <EditableChipList
        ref="distractorList"
        addMode="button"
        inlineOnly
        :chips="state.distractors"
        :addLabel="addDistractorBtn$()"
        :listLabel="distractorsLabel$()"
        :chipLabel="distractorChipLabel"
        :deleteLabel="distractorDeleteLabel"
        :errorMessages="distractorErrorMessages"
        @open="onDistractorsOpen"
        @add-chip="addDistractor"
        @update-chip="setDistractorContent"
        @remove-chip="onRemoveDistractor"
      />
    </div>
  </div>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { ValidationError } from '../../constants';
  import { useGapMatchInteraction } from '../../composables/useGapMatchInteraction';
  import ValidationMessage from '../../components/ValidationMessage/index.vue';
  import ClickableRegion from '../../components/ClickableRegion/index.vue';
  import EditableChipList from '../../components/EditableChipList/index.vue';
  import { generateRandomSlug } from '../../utils/generateRandomSlug';
  import { useGapMatchPassage } from './useGapMatchPassage';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';
  import {
    hasRichTextContent,
    richTextComparisonKey,
  } from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

  export default {
    name: 'GapMatchEditor',

    components: {
      ClickableRegion,
      EditableChipList,
      TipTapEditor,
      ValidationMessage,
    },

    setup(props, { emit }) {
      const {
        questionOptionalLabel$,
        questionLabel$,
        editQuestionLabel$,
        passageEditorLabel$,
        gapMatchAnswersLabel$,
        gapPassageEditorDescription$,
        editPassageLabel$,
        distractorsLabel$,
        distractorsDescription$,
        addDistractorBtn$,
        editDistractorLabel$,
        deleteDistractorBtn$,
        errorEmptyGap$,
        errorNoGap$,
        errorEmptyChoiceContent$,
        errorDuplicateDistractorContent$,
      } = qtiEditorStrings;

      const questionTypeRef = computed(() => props.questionType);

      const {
        state,
        bodyXml,
        responseDeclarations,
        errors,
        setPrompt,
        setPassage,
        addDistractor,
        removeDistractor,
        setDistractorContent,
      } = useGapMatchInteraction(props.interaction, questionTypeRef);

      const errorGapIds = computed(() =>
        errors.value.filter(e => e.code === ValidationError.EMPTY_ANSWER_CONTENT).map(e => e.id),
      );

      const passageDescriptionId = generateRandomSlug('passage-description');
      const passage = useGapMatchPassage({
        errorGapIds,
        // An author editing the question sees its answers, even in the closed passage.
        showAnswers: computed(() => props.mode === 'edit' || props.showAnswers),
        describedBy: passageDescriptionId,
        onChange: setPassage,
      });

      const hasPrompt = computed(() => hasRichTextContent(state.value.prompt));
      const hasGapErrors = computed(() => errorGapIds.value.length > 0);
      const hasNoGap = computed(() =>
        errors.value.some(e => e.code === ValidationError.NO_CORRECT_ANSWER),
      );

      const isPromptOpen = ref(false);
      const isPassageOpen = ref(false);
      const distractorList = ref(null);

      // The distractor list commits its own editor as it closes.
      function closeDistractors() {
        distractorList.value?.close();
      }

      function openPrompt() {
        if (props.mode !== 'edit') return;
        closeDistractors();
        isPromptOpen.value = true;
        isPassageOpen.value = false;
      }

      function openPassage() {
        if (props.mode !== 'edit') return;
        closeDistractors();
        isPassageOpen.value = true;
        isPromptOpen.value = false;
      }

      function onDistractorsOpen() {
        isPromptOpen.value = false;
        isPassageOpen.value = false;
      }

      function onRemoveDistractor(index) {
        closeDistractors();
        removeDistractor(index);
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
          }
        },
        { immediate: true },
      );

      /*
       * A passage message is an alert only when it appears while the passage is closed. While
       * the passage is edited, an Insert makes a blank gap and a deletion is announced, so an
       * alert would cut off what the author is doing.
       */
      const isGapErrorsAlert = ref(true);
      watch(hasGapErrors, isShown => {
        if (isShown) isGapErrorsAlert.value = !isPassageOpen.value;
      });
      const isNoGapAlert = ref(true);
      watch(hasNoGap, isShown => {
        if (isShown) isNoGapAlert.value = !isPassageOpen.value;
      });

      const duplicatedTexts = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.DUPLICATE_DISTRACTOR_CONTENT)
              .map(e => e.text),
          ),
      );

      const distractorErrorMessages = computed(() =>
        state.value.distractors.map(({ content }) => {
          if (!hasRichTextContent(content)) return errorEmptyChoiceContent$();
          if (duplicatedTexts.value.has(richTextComparisonKey(content))) {
            return errorDuplicateDistractorContent$();
          }
          return null;
        }),
      );

      const distractorChipLabel = number => editDistractorLabel$({ number });
      const distractorDeleteLabel = number => deleteDistractorBtn$({ number });

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
        passage,
        passageDescriptionId,
        hasPrompt,
        hasGapErrors,
        hasNoGap,
        isGapErrorsAlert,
        isNoGapAlert,
        isPromptOpen,
        isPassageOpen,
        distractorList,
        openPrompt,
        openPassage,
        onDistractorsOpen,
        onRemoveDistractor,
        distractorErrorMessages,
        distractorChipLabel,
        distractorDeleteLabel,
        setPrompt,
        setPassage,
        addDistractor,
        setDistractorContent,
        questionOptionalLabel$,
        questionLabel$,
        editQuestionLabel$,
        passageEditorLabel$,
        gapMatchAnswersLabel$,
        gapPassageEditorDescription$,
        editPassageLabel$,
        distractorsLabel$,
        distractorsDescription$,
        addDistractorBtn$,
        errorEmptyGap$,
        errorNoGap$,
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
    emits: ['update:interaction', 'update:errors'],
  };

</script>


<style lang="scss" scoped>

  .gap-match-editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .gap-match-editor__section {
    display: flex;
    flex-direction: column;
  }

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
