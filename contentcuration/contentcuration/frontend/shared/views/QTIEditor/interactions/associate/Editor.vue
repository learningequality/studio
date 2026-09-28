<template>

  <div
    ref="rootEl"
    class="associate-layout"
  >
    <!-- Prompt -->
    <div class="editor-section">
      <ValidationMessage v-if="promptHasError">
        {{ errorPromptRequired$() }}
      </ValidationMessage>
      <h4
        class="field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ questionLabel$() }}
      </h4>
      <ClickableRegion
        :class="promptWrapperClass"
        :style="promptWrapperStyle"
        :suppressed="mode !== 'edit' || isPromptOpen"
        :aria-label="editQuestionLabel$()"
        @click="openPrompt"
      >
        <div
          class="item-card-text"
          :class="{ 'is-closed': !isPromptOpen }"
        >
          <TipTapEditor
            :value="state.prompt"
            :mode="isPromptOpen ? mode : 'view'"
            format="html"
            :minHeight="'80px'"
            :autofocus="isPromptOpen"
            :imageProcessor="EditorImageProcessor"
            :tabindex="-1"
            class="editor"
            @update="setPrompt"
            @minimize="closeOpenTarget"
          />
        </div>
      </ClickableRegion>
    </div>

    <!-- Shuffled response pool — what the learner will actually see -->
    <div
      v-if="mode === 'view'"
      class="editor-section"
    >
      <div
        class="is-shuffled pool-box"
        :style="{ borderColor: $themeTokens.fineLine }"
      >
        <h4
          class="section-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ responsePoolLabel$() }}
        </h4>
        <ul
          class="chip-list"
          :aria-label="responsePoolLabel$()"
        >
          <!-- Keyed by position: a choice id may repeat across the pool. -->
          <li
            v-for="(choice, index) in shuffledPool"
            :key="index"
            class="chip"
            :style="poolChipStyles[index]"
          >
            <TipTapEditor
              :value="choice.content"
              mode="view"
              format="html"
              :imageProcessor="EditorImageProcessor"
              :tabindex="-1"
              class="editor"
            />
          </li>
        </ul>
      </div>
    </div>

    <!-- Correct pairs — editable in edit mode, read-only when revealing answers -->
    <div
      v-if="mode === 'edit' || showAnswers"
      class="editor-section"
    >
      <ValidationMessage v-if="tooFewPairsError">
        {{ errorTooFewPairs$() }}
      </ValidationMessage>

      <div class="section-headers">
        <h4
          class="section-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ pairsSectionLabel }}
        </h4>
        <div
          v-if="mode === 'edit'"
          class="section-sublabel"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ correctPairsDescription$() }}
        </div>
      </div>

      <ol
        class="pairs-list"
        :aria-label="pairsSectionLabel"
      >
        <li
          v-for="(pair, index) in state.pairs"
          :key="index"
          class="pair-row"
          :class="{ 'is-stacked': isPairRowStacked(index), 'is-editable': mode === 'edit' }"
        >
          <div
            class="pair-number"
            :style="{ color: $themePalette.grey.v_700 }"
          >
            {{ pairNumberLabel$({ number: index + 1 }) }}
          </div>

          <div class="pair-cards">
            <template v-if="mode === 'edit'">
              <ClickableRegion
                v-for="(choice, position) in pair"
                :key="`${choice.id}-${position}`"
                class="pair-card"
                :class="{ 'is-clickable item-border': !isPairItemOpen(index, position) }"
                :style="pairItemStyles[index][position]"
                :suppressed="isPairItemOpen(index, position)"
                :aria-label="editPairItemLabel$({ number: index + 1, position: position + 1 })"
                @click="openPairItem(index, position)"
              >
                <div
                  class="item-card-text"
                  :class="{ 'is-closed': !isPairItemOpen(index, position) }"
                >
                  <TipTapEditor
                    :value="choice.content"
                    :mode="isPairItemOpen(index, position) ? 'edit' : 'view'"
                    format="html"
                    :minHeight="'48px'"
                    :autofocus="isPairItemOpen(index, position)"
                    :imageProcessor="EditorImageProcessor"
                    :tabindex="-1"
                    class="editor"
                    @update="html => setPairItemContent(index, position, html)"
                    @minimize="closeOpenTarget"
                  />
                </div>
              </ClickableRegion>
            </template>
            <template v-else>
              <div
                v-for="(choice, position) in pair"
                :key="`${choice.id}-${position}`"
                class="chip"
                :style="{ borderColor: $themeTokens.fineLine }"
              >
                <TipTapEditor
                  :value="choice.content"
                  mode="view"
                  format="html"
                  :imageProcessor="EditorImageProcessor"
                  :tabindex="-1"
                  class="editor"
                />
              </div>
            </template>
          </div>

          <div
            v-if="mode === 'edit'"
            class="pair-actions"
            @click.stop
          >
            <KIconButton
              icon="close"
              size="small"
              :disabled="isOnlyPair"
              :ariaLabel="deletePairBtn$({ number: index + 1 })"
              :tooltip="deletePairBtn$({ number: index + 1 })"
              :color="isOnlyPair ? $themeTokens.textDisabled : $themePalette.grey.v_700"
              @click="onRemovePair(index)"
            />
          </div>

          <div
            v-if="pairErrorMessages[index].length"
            class="pair-messages"
          >
            <ValidationMessage
              v-for="message in pairErrorMessages[index]"
              :key="message"
            >
              {{ message }}
            </ValidationMessage>
          </div>
        </li>
      </ol>

      <!--
        The editor this opens mounts before the click finishes bubbling, and
        TipTap closes on any click outside itself — so the click stops here.
      -->
      <div
        v-if="mode === 'edit'"
        @click.stop
      >
        <AddListItemButton
          ref="addPairButton"
          :label="addPairBtn$()"
          @click="onAddPair"
        />
      </div>
    </div>

    <!-- Distractors -->
    <div
      v-if="mode === 'edit'"
      class="editor-section"
    >
      <div class="section-headers">
        <h4
          class="section-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ distractorsLabel$() }}
        </h4>
        <div
          class="section-sublabel"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ distractorsDescription$() }}
        </div>
      </div>

      <div
        class="pool-box"
        :style="{ borderColor: $themeTokens.fineLine }"
      >
        <ul
          class="chip-list"
          :aria-label="distractorsLabel$()"
        >
          <li
            v-for="(choice, index) in state.distractors"
            :key="`${choice.id}-${index}`"
            class="distractor"
            :class="{ 'is-editing': isDistractorOpen(index) }"
          >
            <ClickableRegion
              class="distractor-row"
              :class="{ 'chip is-tinted is-clickable': !isDistractorOpen(index) }"
              :style="distractorStyles[index]"
              :suppressed="isDistractorOpen(index)"
              :aria-label="editDistractorLabel$({ number: index + 1 })"
              @click="openDistractor(choice)"
            >
              <div class="distractor-content">
                <TipTapEditor
                  :value="choice.content"
                  :mode="isDistractorOpen(index) ? 'edit' : 'view'"
                  format="html"
                  :minHeight="'48px'"
                  :autofocus="isDistractorOpen(index)"
                  :imageProcessor="EditorImageProcessor"
                  :tabindex="-1"
                  class="editor"
                  @update="html => setDistractorContent(index, html)"
                  @minimize="closeOpenTarget"
                />
              </div>

              <!-- `@click.stop` so removing the chip does not also open it -->
              <div
                class="distractor-actions"
                @click.stop
              >
                <KIconButton
                  icon="close"
                  size="small"
                  :ariaLabel="deleteDistractorBtn$({ number: index + 1 })"
                  :tooltip="deleteDistractorBtn$({ number: index + 1 })"
                  :color="$themePalette.grey.v_700"
                  @click="onRemoveDistractor(choice)"
                />
              </div>
            </ClickableRegion>
            <ValidationMessage v-if="distractorErrorMessages[index]">
              {{ distractorErrorMessages[index] }}
            </ValidationMessage>
          </li>
        </ul>

        <!--
          A new distractor is written below the pool and joins it when its
          editor closes, so the pool never holds a half-written chip. Clicks
          stop here for the same reason they stop on the add buttons.
        -->
        <div
          v-if="draft"
          class="draft-row"
          @click.stop
        >
          <div class="draft-editor">
            <TipTapEditor
              :key="draftKey"
              :value="draft.content"
              mode="edit"
              format="html"
              :minHeight="'48px'"
              autofocus
              :imageProcessor="EditorImageProcessor"
              :tabindex="-1"
              class="editor"
              @update="setDraftContent"
              @minimize="closeOpenTarget"
            />
          </div>
          <!-- Numbered for the place it would take, so it reads as this row's
               remove button while doubling as the way to abandon the draft. -->
          <KIconButton
            icon="close"
            size="small"
            :ariaLabel="deleteDistractorBtn$({ number: state.distractors.length + 1 })"
            :tooltip="deleteDistractorBtn$({ number: state.distractors.length + 1 })"
            :color="$themePalette.grey.v_700"
            @click="onDiscardDraft"
          />
        </div>

        <div @click.stop>
          <AddListItemButton
            ref="addDistractorButton"
            :label="addDistractorBtn$()"
            @click="onAddDistractor"
          />
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import { computed, nextTick, ref, watch } from 'vue';
  import flatten from 'lodash/flatten';
  import isEqual from 'lodash/isEqual';
  import shuffle from 'lodash/shuffle';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { ValidationError } from '../../constants';
  import { useAssociateInteraction } from '../../composables/useAssociateInteraction';
  import ValidationMessage from '../../components/ValidationMessage/index.vue';
  import AddListItemButton from '../../components/AddListItemButton/index.vue';
  import ClickableRegion from '../../components/ClickableRegion/index.vue';
  import { hasRichTextContent, richTextComparisonKey } from '../../utils/richText';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  /** Which card currently holds the open TipTap editor. */
  const OpenTarget = Object.freeze({
    PROMPT: 'prompt',
    PAIR: 'pair',
    DISTRACTOR: 'distractor',
    DRAFT: 'draft',
  });

  export default {
    name: 'AssociateInteractionEditor',

    components: {
      TipTapEditor,
      ValidationMessage,
      AddListItemButton,
      ClickableRegion,
    },

    setup(props, { emit }) {
      const { windowIsLarge, windowIsSmall } = useKResponsiveWindow();
      const tokens = themeTokens();
      const palette = themePalette();

      const {
        questionLabel$,
        editQuestionLabel$,
        errorPromptRequired$,
        correctPairsLabel$,
        correctPairsDescription$,
        correctAnswersLabel$,
        responsePoolLabel$,
        distractorsLabel$,
        distractorsDescription$,
        pairNumberLabel$,
        addPairBtn$,
        deletePairBtn$,
        addDistractorBtn$,
        deleteDistractorBtn$,
        editPairItemLabel$,
        editDistractorLabel$,
        errorTooFewPairs$,
        errorDuplicatePairContent$,
        errorDuplicateDistractorContent$,
        errorEmptyChoiceContent$,
      } = qtiEditorStrings;

      const questionTypeRef = computed(() => props.questionType);

      const {
        state,
        bodyXml,
        responseDeclarations,
        errors,
        addPair,
        removePair,
        setPair,
        addDistractor,
        removeDistractor,
        setDistractorContent,
        setPrompt,
      } = useAssociateInteraction(props.interaction, questionTypeRef);

      // At most one card holds an open TipTap editor at a time.
      const openTarget = ref(null);

      // The distractor being written, held out of state until its editor closes.
      const draft = ref(null);

      // A TipTap editor takes focus only as it mounts, so bumping this key on every
      // add press remounts the draft editor — patched in place it leaves focus behind.
      const draftKey = ref(0);

      const rootEl = ref(null);
      const addPairButton = ref(null);
      const addDistractorButton = ref(null);

      /**
       * The press that removes a row unmounts its own delete button, dropping focus to
       * the body. Hand focus to the row taking its place, or to the add button.
       */
      async function focusAfterRemoval(deleteButtonSelector, index, addButton) {
        await nextTick();
        const buttons = [...(rootEl.value?.querySelectorAll(deleteButtonSelector) ?? [])].filter(
          button => !button.disabled,
        );
        (buttons[Math.min(index, buttons.length - 1)] ?? addButton.value?.$el)?.focus();
      }

      const isPromptOpen = computed(
        () => props.mode === 'edit' && openTarget.value?.kind === OpenTarget.PROMPT,
      );

      function isPairRowOpen(index) {
        const target = openTarget.value;
        return props.mode === 'edit' && target?.kind === OpenTarget.PAIR && target.index === index;
      }

      function isPairItemOpen(index, position) {
        return isPairRowOpen(index) && openTarget.value.position === position;
      }

      // Two cards side by side leave an open editor too narrow to hold its
      // toolbar on anything but a large screen, so the row being edited stacks.
      // A small screen is too narrow for the pair even closed, so it stacks throughout.
      function isPairRowStacked(index) {
        return windowIsSmall.value || (!windowIsLarge.value && isPairRowOpen(index));
      }

      function isDistractorOpen(index) {
        const target = openTarget.value;
        return (
          props.mode === 'edit' && target?.kind === OpenTarget.DISTRACTOR && target.index === index
        );
      }

      /**
       * Closing a distractor's editor is what commits it: a written draft joins
       * the pool, and a distractor left blank drops out of it. Either shifts the
       * indexes that follow, so callers re-resolve the row they were holding.
       */
      function closeOpenTarget() {
        const target = openTarget.value;
        openTarget.value = null;
        if (target?.kind === OpenTarget.DRAFT) {
          const { content } = draft.value;
          draft.value = null;
          if (hasRichTextContent(content)) addDistractor(content);
        } else if (target?.kind === OpenTarget.DISTRACTOR) {
          const choice = state.value.distractors[target.index];
          if (choice && !hasRichTextContent(choice.content)) removeDistractor(target.index);
        }
      }

      // Leaving edit mode throws the draft away rather than committing it: the
      // parent stops listening for updates, so a commit would go unreported.
      function discardDraft() {
        openTarget.value = null;
        draft.value = null;
      }

      function openPrompt() {
        if (props.mode !== 'edit') return;
        closeOpenTarget();
        openTarget.value = { kind: OpenTarget.PROMPT };
      }

      function openPairItem(index, position) {
        if (props.mode !== 'edit') return;
        closeOpenTarget();
        openTarget.value = { kind: OpenTarget.PAIR, index, position };
      }

      function openDistractor(choice) {
        if (props.mode !== 'edit') return;
        closeOpenTarget();
        const index = state.value.distractors.indexOf(choice);
        if (index !== -1) openTarget.value = { kind: OpenTarget.DISTRACTOR, index };
      }

      function setPairItemContent(index, position, html) {
        const pair = state.value.pairs[index].map((choice, i) =>
          i === position ? { ...choice, content: html } : choice,
        );
        setPair(index, pair);
      }

      function onAddPair() {
        addPair();
        openPairItem(state.value.pairs.length - 1, 0);
      }

      function onAddDistractor() {
        if (props.mode !== 'edit') return;
        closeOpenTarget();
        draftKey.value += 1;
        draft.value = { content: '' };
        openTarget.value = { kind: OpenTarget.DRAFT };
      }

      function setDraftContent(html) {
        draft.value = { content: html };
      }

      // Open targets are held by index, so a deletion shifts the ones after it —
      // close the editor rather than let it land on a different item.
      function onRemovePair(index) {
        closeOpenTarget();
        removePair(index);
        focusAfterRemoval('.pair-actions button', index, addPairButton);
      }

      function onRemoveDistractor(choice) {
        const index = state.value.distractors.indexOf(choice);
        if (index === -1) return;
        // Closing drops a distractor left blank, so this one may already be gone —
        // and the rest have shifted. Re-resolve before removing, but still move
        // focus off the button this press is unmounting.
        closeOpenTarget();
        const remaining = state.value.distractors.indexOf(choice);
        if (remaining !== -1) removeDistractor(remaining);
        focusAfterRemoval('.distractor-actions button', index, addDistractorButton);
      }

      // Separate from discardDraft, which also runs on leaving edit mode — moving focus
      // there would pull it back into a section that is being unmounted.
      function onDiscardDraft() {
        discardDraft();
        addDistractorButton.value?.$el?.focus();
      }

      const workingInteraction = computed(() => ({
        bodyXml: bodyXml.value,
        responseDeclarations: responseDeclarations.value,
      }));

      watch(
        () => props.mode,
        newMode => {
          if (newMode !== 'edit') {
            discardDraft();
            return;
          }
          if (!hasRichTextContent(state.value.prompt)) {
            openPrompt();
          } else if (state.value.pairs.length > 0) {
            openPairItem(0, 0);
          }
        },
        { immediate: true },
      );

      // Rebuilding yields a fresh object on every state change, so compare by
      // value — reopening an editor or retyping the same text is not a change.
      watch(workingInteraction, (newVal, oldVal) => {
        if (props.mode !== 'edit' || isEqual(newVal, oldVal)) return;
        emit('update:interaction', newVal);
      });

      // Errors are reported the same way, for the card to show that the question needs work.
      watch(errors, newVal => emit('update:errors', newVal), { immediate: true });

      const errorCodes = computed(() => errors.value.map(e => e.code));

      const promptHasError = computed(() =>
        errorCodes.value.includes(ValidationError.PROMPT_REQUIRED),
      );

      const tooFewPairsError = computed(() =>
        errorCodes.value.includes(ValidationError.TOO_FEW_PAIRS),
      );

      // Blankness is re-derived from the content rather than read off the
      // EMPTY_CHOICE_CONTENT error's id, because an id may repeat across choices.
      function isBlank(choice) {
        return !hasRichTextContent(choice.content);
      }

      const duplicatedTexts = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.DUPLICATE_DISTRACTOR_CONTENT)
              .map(e => e.text),
          ),
      );

      function isDuplicated(choice) {
        return duplicatedTexts.value.has(richTextComparisonKey(choice.content));
      }

      const duplicatePairIndexes = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.DUPLICATE_PAIR_CONTENT)
              .map(e => e.index),
          ),
      );

      // Every fault that reddens a card in the row is also named under the row.
      const pairErrorMessages = computed(() =>
        state.value.pairs.map((pair, index) => {
          const messages = [];
          if (duplicatePairIndexes.value.has(index)) messages.push(errorDuplicatePairContent$());
          if (pair.some(isBlank)) messages.push(errorEmptyChoiceContent$());
          if (pair.some(isDuplicated)) messages.push(errorDuplicateDistractorContent$());
          return messages;
        }),
      );

      const distractorErrorMessages = computed(() =>
        state.value.distractors.map(choice => {
          if (isBlank(choice)) return errorEmptyChoiceContent$();
          if (isDuplicated(choice)) return errorDuplicateDistractorContent$();
          return null;
        }),
      );

      function choiceHasError(choice) {
        return isBlank(choice) || isDuplicated(choice);
      }

      function borderStyle(hasError) {
        return { borderColor: hasError ? tokens.error : tokens.fineLine };
      }

      // A pair member turns red for its own fault or for the pair's, so the two
      // items of an identical pair are both marked.
      const pairItemStyles = computed(() =>
        state.value.pairs.map((pair, index) =>
          pair.map((choice, choiceIndex) =>
            isPairItemOpen(index, choiceIndex)
              ? {}
              : borderStyle(duplicatePairIndexes.value.has(index) || choiceHasError(choice)),
          ),
        ),
      );

      // An open distractor is bordered by its own editor, so the row adds none.
      const distractorStyles = computed(() =>
        state.value.distractors.map((choice, index) =>
          isDistractorOpen(index) ? {} : borderStyle(choiceHasError(choice)),
        ),
      );

      const promptWrapperClass = computed(() =>
        isPromptOpen.value
          ? 'prompt-wrapper'
          : ['item-border', { 'is-clickable': props.mode === 'edit' }],
      );

      const promptWrapperStyle = computed(() =>
        isPromptOpen.value ? {} : borderStyle(promptHasError.value),
      );

      const isOnlyPair = computed(() => state.value.pairs.length <= 1);

      const pairsSectionLabel = computed(() =>
        props.mode === 'edit' ? correctPairsLabel$() : correctAnswersLabel$(),
      );

      // Blank pair members are left out: every blank choice keys the same, so
      // keeping them would mark an unwritten option in the pool as correct.
      const pairedTexts = computed(
        () =>
          new Set(
            flatten(state.value.pairs)
              .filter(choice => hasRichTextContent(choice.content))
              .map(choice => richTextComparisonKey(choice.content)),
          ),
      );

      // One option per association the learner can make: the emitted XML folds
      // choices holding the same answer into a single option whose match-max is
      // the number of occurrences walked here.
      const shuffledPool = computed(() =>
        shuffle([...flatten(state.value.pairs), ...state.value.distractors]),
      );

      const poolChipStyles = computed(() =>
        shuffledPool.value.map(choice => {
          const isCorrect =
            props.showAnswers && pairedTexts.value.has(richTextComparisonKey(choice.content));
          return {
            borderColor: isCorrect ? palette.green.v_600 : tokens.fineLine,
            backgroundColor: isCorrect ? palette.green.v_50 : null,
          };
        }),
      );

      return {
        EditorImageProcessor,
        rootEl,
        addPairButton,
        addDistractorButton,
        state,
        isPromptOpen,
        promptWrapperClass,
        promptWrapperStyle,
        openPrompt,
        closeOpenTarget,
        isPairItemOpen,
        isPairRowStacked,
        isDistractorOpen,
        openPairItem,
        openDistractor,
        setPairItemContent,
        setDistractorContent,
        setPrompt,
        onRemovePair,
        onRemoveDistractor,
        onAddPair,
        onAddDistractor,
        draft,
        draftKey,
        setDraftContent,
        onDiscardDraft,
        promptHasError,
        tooFewPairsError,
        pairErrorMessages,
        distractorErrorMessages,
        pairItemStyles,
        distractorStyles,
        isOnlyPair,
        pairsSectionLabel,
        shuffledPool,
        poolChipStyles,
        questionLabel$,
        editQuestionLabel$,
        errorPromptRequired$,
        correctPairsDescription$,
        responsePoolLabel$,
        distractorsLabel$,
        distractorsDescription$,
        pairNumberLabel$,
        addPairBtn$,
        deletePairBtn$,
        addDistractorBtn$,
        deleteDistractorBtn$,
        editPairItemLabel$,
        editDistractorLabel$,
        errorTooFewPairs$,
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

  .associate-layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .editor-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* A heading, so its own margins are set rather than inherited from the UA stylesheet */
  .field-label {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
  }

  .section-headers {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 4px;
  }

  .section-label {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
  }

  .section-sublabel {
    font-size: 12px;
    font-weight: 400;
  }

  .item-border {
    border: 1px solid;
    border-radius: 4px;
    transition: background-color 0.3s;

    &.is-clickable {
      cursor: pointer;

      &:hover {
        background-color: v-bind('$themeTokens.fineLine');
      }
    }
  }

  .item-card-text {
    padding: 8px 16px;

    &.is-closed {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 52px;
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .prompt-wrapper {
    position: relative;
    padding: 4px 0;
  }

  .pairs-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .pair-row {
    display: grid;
    grid-template-areas:
      'label cards actions'
      'message message message';
    grid-template-columns: auto 1fr auto;

    // Column-only: the message row track exists even when empty, so a row gap
    // would pad every row without a message.
    column-gap: 8px;
    align-items: center;
    border-radius: 4px;

    &.is-editable {
      padding: 8px;
      background-color: v-bind('$themePalette.grey.v_50');
      border: 1px solid v-bind('$themeTokens.fineLine');
    }

    &.is-stacked {
      grid-template-areas:
        'label actions'
        'cards cards'
        'message message';
      grid-template-columns: 1fr auto;
    }
  }

  .pair-number {
    grid-area: label;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .pair-cards {
    display: flex;
    grid-area: cards;
    gap: 8px;
    align-items: stretch;
    min-width: 0;

    .is-stacked & {
      flex-direction: column;
      margin-top: 8px;

      // A view-mode chip is a pill sized by its content, so the column that
      // stacks it must not stretch it to the row's width.
      > .chip {
        align-self: flex-start;
      }
    }
  }

  // A pair card sits on the tinted row, so it carries the surface colour itself.
  // Its editor stretches with it: a card pulled taller by the one beside it
  // would otherwise show the editor's own bottom border above its own.
  .pair-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    background-color: v-bind('$themeTokens.surface');

    ::v-deep .content-wrapper {
      display: flex;
      flex: 1;
      flex-direction: column;
    }

    .editor {
      flex: 1;
    }

    .item-card-text {
      display: flex;
      flex: 1;
      flex-direction: column;
      padding: 0;

      &.is-closed {
        min-height: 40px;

        // A closed card shows one line, so paragraph margins would only push it
        // past that height.
        ::v-deep .ProseMirror p {
          margin: 0;
        }
      }
    }

    ::v-deep .editor-content {
      padding: 8px;
    }
  }

  .pair-actions {
    display: flex;
    grid-area: actions;
    align-items: center;
  }

  .pair-messages {
    display: flex;
    flex-direction: column;
    grid-area: message;
    gap: 4px;
    margin-top: 8px;
  }

  .pool-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid;
    border-radius: 4px;

    &.is-shuffled {
      background-color: v-bind('$themePalette.grey.v_50');
    }
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  // A chip is a compact pill, so it replaces the editor's own content padding
  // and paragraph margins with its own.
  .chip {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
    max-width: 100%;
    padding: 4px 12px;
    background-color: v-bind('$themeTokens.surface');
    border: 1px solid;
    border-radius: 8px;

    // Tinted only in the distractor pool, whose box sits on the surface; the
    // shuffled pool is itself tinted, so its chips stay on the surface.
    &.is-tinted {
      background-color: v-bind('$themePalette.grey.v_50');
    }

    ::v-deep .editor-content {
      padding: 0;
    }

    ::v-deep .ProseMirror p {
      margin: 0;
    }
  }

  .draft-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  // The open editor draws its own border, so the row it sits in adds none.
  .draft-editor {
    flex: 1;
    min-width: 0;
    background-color: v-bind('$themeTokens.surface');
  }

  // Stacks the chip over the validation message that belongs to it, so a
  // flagged distractor pushes the chips after it along rather than down.
  .distractor {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 100%;

    &.is-editing {
      flex-basis: 100%;
    }
  }

  // The chip itself is the clickable region, so hover, focus ring and radius all
  // follow the chip's own edge.
  .distractor-row {
    display: flex;
    align-items: center;

    &.is-clickable {
      cursor: pointer;
      transition: background-color 0.3s;

      &:hover {
        background-color: v-bind('$themeTokens.fineLine');
      }
    }

    ::v-deep .content-wrapper {
      display: flex;
      flex: 1;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }
  }

  // A blank choice renders nothing, so without a floor the chip collapses to a
  // strip too small to click.
  .distractor-content {
    flex: 1;
    min-width: 24px;
    min-height: 24px;
  }

  .editor {
    width: 100%;
  }

</style>
