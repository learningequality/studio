<template>

  <div class="associate-layout">
    <!-- Prompt -->
    <div class="editor-section">
      <ValidationMessage v-if="promptHasError">
        {{ errorPromptRequired$() }}
      </ValidationMessage>
      <div
        class="field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ questionLabel$() }}
      </div>
      <ClickableRegion
        :class="promptWrapperClass"
        :style="promptWrapperStyle"
        :suppressed="mode !== 'edit' || isPromptOpen"
        :aria-label="editQuestionLabel$()"
        @click="handlePromptClick"
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
        <div
          class="section-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ responsePoolLabel$() }}
        </div>
        <ul
          class="chip-list"
          :aria-label="responsePoolLabel$()"
        >
          <li
            v-for="choice in shuffledPool"
            :key="choice.id"
            class="chip"
            :style="poolChipStyle(choice.id)"
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
        <div
          class="section-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ pairsSectionLabel }}
        </div>
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
          :class="{ 'is-stacked': windowIsSmall, 'is-editable': mode === 'edit' }"
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
                class="item-border pair-card"
                :class="{ 'is-clickable': !isPairItemOpen(index, position) }"
                :style="cardStyle(choice.id)"
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
              :disabled="state.pairs.length <= 1"
              :ariaLabel="deletePairBtn$({ number: index + 1 })"
              :tooltip="deletePairBtn$({ number: index + 1 })"
              :color="$themePalette.grey.v_800"
              @click="onRemovePair(index)"
            />
          </div>

          <ValidationMessage
            v-if="pairErrorMessage(index)"
            class="pair-message"
          >
            {{ pairErrorMessage(index) }}
          </ValidationMessage>
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
        <div
          class="section-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ distractorsLabel$() }}
        </div>
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
            :class="isDistractorOpen(index) ? 'distractor-editing' : 'chip is-tinted'"
            :style="cardStyle(choice.id)"
          >
            <ClickableRegion
              class="chip-region"
              :class="{ 'is-clickable': !isDistractorOpen(index) }"
              :suppressed="isDistractorOpen(index)"
              :aria-label="editDistractorLabel$({ number: index + 1 })"
              @click="openDistractor(index)"
            >
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
            </ClickableRegion>
            <KIconButton
              icon="close"
              size="mini"
              :ariaLabel="deleteDistractorBtn$({ number: index + 1 })"
              :tooltip="deleteDistractorBtn$({ number: index + 1 })"
              :color="$themePalette.grey.v_800"
              @click="onRemoveDistractor(index)"
            />
          </li>
        </ul>

        <ValidationMessage v-if="hasBlankDistractor">
          {{ errorEmptyChoiceContent$() }}
        </ValidationMessage>

        <!--
          A new distractor is written below the pool and only joins it on Save,
          so the pool never holds a half-written chip. Clicks stop here for the
          same reason they stop on the add buttons.
        -->
        <div
          v-if="draft"
          class="draft-row"
          @click.stop
        >
          <div
            v-if="isDraftOpen"
            class="draft-editor item-border"
            :style="{ borderColor: $themeTokens.fineLine }"
          >
            <TipTapEditor
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
          <ClickableRegion
            v-else
            class="chip draft-chip is-tinted"
            :style="{ borderColor: $themeTokens.fineLine }"
            :aria-label="editNewDistractorLabel$()"
            @click="openDraft"
          >
            {{ newDistractorLabel$() }}
          </ClickableRegion>
          <KButton
            primary
            :text="saveDistractorBtn$()"
            @click="saveDraft"
          />
        </div>
        <div
          v-else
          @click.stop
        >
          <AddListItemButton
            :label="addDistractorBtn$()"
            @click="onAddDistractor"
          />
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import flatten from 'lodash/flatten';
  import shuffle from 'lodash/shuffle';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { ValidationError } from '../../constants';
  import { useAssociateInteraction } from '../../composables/useAssociateInteraction';
  import ValidationMessage from '../../components/ValidationMessage/index.vue';
  import AddListItemButton from '../../components/AddListItemButton/index.vue';
  import ClickableRegion from '../../components/ClickableRegion/index.vue';
  import { stripTags } from '../../utils/stripTags';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  export default {
    name: 'AssociateInteractionEditor',

    components: {
      TipTapEditor,
      ValidationMessage,
      AddListItemButton,
      ClickableRegion,
    },

    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();
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
        errorEmptyChoiceContent$,
        saveDistractorBtn$,
        newDistractorLabel$,
        editNewDistractorLabel$,
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

      // The distractor being written, held out of state until it is saved.
      const draft = ref(null);

      const isPromptOpen = computed(
        () => props.mode === 'edit' && openTarget.value?.kind === 'prompt',
      );

      function isPairItemOpen(index, position) {
        const target = openTarget.value;
        return (
          props.mode === 'edit' &&
          target?.kind === 'pair' &&
          target.index === index &&
          target.position === position
        );
      }

      function isDistractorOpen(index) {
        const target = openTarget.value;
        return props.mode === 'edit' && target?.kind === 'distractor' && target.index === index;
      }

      const isDraftOpen = computed(
        () => props.mode === 'edit' && openTarget.value?.kind === 'draft',
      );

      function openPrompt() {
        openTarget.value = { kind: 'prompt' };
      }

      function closeOpenTarget() {
        openTarget.value = null;
      }

      function handlePromptClick() {
        if (props.mode === 'edit') openPrompt();
      }

      function openPairItem(index, position) {
        if (props.mode === 'edit') openTarget.value = { kind: 'pair', index, position };
      }

      function openDistractor(index) {
        if (props.mode === 'edit') openTarget.value = { kind: 'distractor', index };
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

      function openDraft() {
        if (props.mode === 'edit') openTarget.value = { kind: 'draft' };
      }

      function onAddDistractor() {
        draft.value = { content: '' };
        openDraft();
      }

      function setDraftContent(html) {
        draft.value = { content: html };
      }

      function saveDraft() {
        addDistractor(draft.value.content);
        draft.value = null;
        closeOpenTarget();
      }

      // Open targets are held by index, so a deletion shifts the ones after it —
      // close the editor rather than let it land on a different item.
      function onRemovePair(index) {
        closeOpenTarget();
        removePair(index);
      }

      function onRemoveDistractor(index) {
        closeOpenTarget();
        removeDistractor(index);
      }

      const workingInteraction = computed(() => ({
        bodyXml: bodyXml.value,
        responseDeclarations: responseDeclarations.value,
      }));

      watch(
        () => props.mode,
        newMode => {
          if (newMode !== 'edit') {
            closeOpenTarget();
            draft.value = null;
            return;
          }
          if (!stripTags(state.value.prompt).trim()) {
            openPrompt();
          } else if (state.value.pairs.length > 0) {
            openPairItem(0, 0);
          }
          emit('update:interaction', workingInteraction.value);
        },
        { immediate: true },
      );

      watch(workingInteraction, newVal => {
        if (props.mode === 'edit') emit('update:interaction', newVal);
      });

      const errorCodes = computed(() => errors.value.map(e => e.code));

      const promptHasError = computed(() =>
        errorCodes.value.includes(ValidationError.PROMPT_REQUIRED),
      );

      const tooFewPairsError = computed(() =>
        errorCodes.value.includes(ValidationError.TOO_FEW_PAIRS),
      );

      const emptyChoiceIds = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.EMPTY_CHOICE_CONTENT)
              .map(e => e.id),
          ),
      );

      const duplicatePairIndexes = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.DUPLICATE_PAIR_CONTENT)
              .map(e => e.index),
          ),
      );

      function pairErrorMessage(index) {
        if (duplicatePairIndexes.value.has(index)) return errorDuplicatePairContent$();
        const pair = state.value.pairs[index];
        if (pair.some(choice => emptyChoiceIds.value.has(choice.id))) {
          return errorEmptyChoiceContent$();
        }
        return null;
      }

      const hasBlankDistractor = computed(() =>
        state.value.distractors.some(choice => emptyChoiceIds.value.has(choice.id)),
      );

      function cardStyle(id) {
        return {
          borderColor: emptyChoiceIds.value.has(id) ? tokens.error : tokens.fineLine,
        };
      }

      const promptWrapperClass = computed(() =>
        isPromptOpen.value
          ? 'prompt-wrapper'
          : ['item-border', { 'is-clickable': props.mode === 'edit' }],
      );

      const promptWrapperStyle = computed(() =>
        isPromptOpen.value
          ? {}
          : { borderColor: promptHasError.value ? tokens.error : tokens.fineLine },
      );

      const pairsSectionLabel = computed(() =>
        props.mode === 'edit' ? correctPairsLabel$() : correctAnswersLabel$(),
      );

      const pairedIds = computed(() => new Set(flatten(state.value.pairs).map(c => c.id)));

      const shuffledPool = computed(() => {
        const byId = new Map(
          [...flatten(state.value.pairs), ...state.value.distractors].map(c => [c.id, c]),
        );
        return shuffle([...byId.values()]);
      });

      function poolChipStyle(id) {
        const isCorrect = props.showAnswers && pairedIds.value.has(id);
        return {
          borderColor: isCorrect ? palette.green.v_600 : tokens.fineLine,
          backgroundColor: isCorrect ? palette.green.v_50 : null,
        };
      }

      return {
        EditorImageProcessor,
        state,
        windowIsSmall,
        isPromptOpen,
        promptWrapperClass,
        promptWrapperStyle,
        handlePromptClick,
        closeOpenTarget,
        isPairItemOpen,
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
        isDraftOpen,
        openDraft,
        setDraftContent,
        saveDraft,
        promptHasError,
        tooFewPairsError,
        pairErrorMessage,
        hasBlankDistractor,
        cardStyle,
        pairsSectionLabel,
        shuffledPool,
        poolChipStyle,
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
        saveDistractorBtn$,
        newDistractorLabel$,
        editNewDistractorLabel$,
        editPairItemLabel$,
        editDistractorLabel$,
        errorTooFewPairs$,
        errorEmptyChoiceContent$,
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

  .field-label {
    margin-bottom: 8px;
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
    }
  }

  // A pair card sits on the tinted row, so it carries the surface colour itself.
  .pair-card {
    flex: 1;
    min-width: 0;
    background-color: v-bind('$themeTokens.surface');

    .item-card-text {
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

  .pair-message {
    grid-area: message;
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
    padding: 4px 12px;
    background-color: v-bind('$themeTokens.surface');
    border: 1px solid;
    border-radius: 4px;

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

  // A blank choice renders nothing, so without a floor the chip collapses to a
  // strip too small to click.
  .chip-region {
    min-width: 24px;
    min-height: 24px;
    border-radius: 4px;

    &.is-clickable {
      cursor: pointer;
    }
  }

  .draft-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .draft-editor {
    flex: 1;
    min-width: 0;
    background-color: v-bind('$themeTokens.surface');
  }

  .draft-chip {
    color: v-bind('$themeTokens.annotation');
    cursor: pointer;
  }

  .distractor-editing {
    display: flex;
    flex-basis: 100%;
    align-items: center;
    padding: 4px 12px;
    border: 1px solid;
    border-radius: 4px;

    .chip-region {
      flex: 1;
    }
  }

  .editor {
    width: 100%;
  }

</style>
