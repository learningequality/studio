<template>

  <div class="match-layout">
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
      <ShuffledResponsePool
        :choices="poolChoices"
        :label="responsePoolLabel$()"
      />
    </div>

    <!-- Matching rows -->
    <div class="editor-section">
      <ValidationMessage v-if="tooFewRowsError">
        {{ errorTooFewRows$() }}
      </ValidationMessage>

      <div class="section-headers">
        <h4
          class="section-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ matchingRowsLabel$() }}
        </h4>
        <div
          v-if="mode === 'edit'"
          class="section-sublabel"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ matchingRowsDescription$() }}
        </div>
      </div>

      <!-- A stacked row labels its own prompt and answers instead. -->
      <div
        v-if="!windowIsSmall"
        class="column-headers"
        :class="{ 'is-editable': mode === 'edit' }"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        <div>{{ promptColumnLabel$() }}</div>
        <div v-if="showsAnswers">{{ answersColumnLabel$() }}</div>
      </div>

      <ol
        class="rows-list"
        :aria-label="matchingRowsLabel$()"
      >
        <li
          v-for="(row, index) in state.rows"
          :key="index"
          class="match-row"
          :class="{ 'is-stacked': isRowStacked(index), 'is-editable': mode === 'edit' }"
        >
          <template v-if="isRowStacked(index)">
            <div
              class="prompt-label row-label"
              :style="{ color: $themePalette.grey.v_700 }"
            >
              {{ promptColumnLabel$() }}
            </div>
            <div
              v-if="showsAnswers"
              class="answers-label row-label"
              :style="{ color: $themePalette.grey.v_700 }"
            >
              {{ answersColumnLabel$() }}
            </div>
          </template>

          <template v-if="mode === 'edit'">
            <ClickableRegion
              class="row-prompt"
              :class="{ 'is-clickable item-border': !isRowPromptOpen(index) }"
              :style="rowPromptStyles[index]"
              :suppressed="isRowPromptOpen(index)"
              :aria-label="editRowLabel$({ number: index + 1 })"
              @click="openRow(index)"
            >
              <div
                class="item-card-text"
                :class="{ 'is-closed': !isRowPromptOpen(index) }"
              >
                <TipTapEditor
                  :value="row.content"
                  :mode="isRowPromptOpen(index) ? 'edit' : 'view'"
                  format="html"
                  padding="small"
                  :minHeight="'48px'"
                  :autofocus="isRowPromptOpen(index)"
                  :imageProcessor="EditorImageProcessor"
                  :tabindex="-1"
                  class="editor"
                  @update="html => setRowContent(index, html)"
                  @minimize="closeOpenTarget"
                />
              </div>
            </ClickableRegion>

            <EditableChipList
              ref="answerLists"
              class="row-answers"
              addMode="region"
              :minChips="1"
              :placeholder="answerPlaceholder$()"
              :chips="row.matches"
              :addLabel="addMatchLabel$({ number: index + 1 })"
              :listLabel="rowAnswersLabel$({ number: index + 1 })"
              :chipLabel="position => editMatchLabel$({ number: index + 1, position })"
              :deleteLabel="position => deleteMatchBtn$({ number: index + 1, position })"
              :errorMessages="matchErrorMessages[index]"
              @open="onListOpen(OpenTarget.ANSWERS, index)"
              @close="onListClose(OpenTarget.ANSWERS, index)"
              @add-chip="html => addMatch(index, html)"
              @update-chip="(position, html) => onMatchUpdate(index, position, html)"
              @remove-chip="position => removeMatch(index, position)"
            />

            <div
              class="row-actions"
              @click.stop
            >
              <KIconButton
                ref="deleteRowButtons"
                icon="close"
                size="small"
                :disabled="isOnlyRow"
                :ariaLabel="deleteRowBtn$({ number: index + 1 })"
                :tooltip="deleteRowBtn$({ number: index + 1 })"
                :color="isOnlyRow ? $themeTokens.textDisabled : $themePalette.grey.v_700"
                @click="onRemoveRow(index)"
              />
            </div>
          </template>
          <template v-else>
            <div
              class="chip view-prompt"
              :style="{ borderColor: $themeTokens.fineLine }"
            >
              <TipTapEditor
                :value="row.content"
                mode="view"
                format="html"
                padding="none"
                :imageProcessor="EditorImageProcessor"
                :tabindex="-1"
                class="editor"
              />
            </div>
            <ul
              v-if="showsAnswers"
              class="chip-list row-answers"
              :aria-label="rowAnswersLabel$({ number: index + 1 })"
            >
              <li
                v-for="(choice, position) in row.matches"
                :key="`${choice.id}-${position}`"
                class="chip"
                :style="{ borderColor: $themeTokens.fineLine }"
              >
                <TipTapEditor
                  :value="choice.content"
                  mode="view"
                  format="html"
                  padding="none"
                  :imageProcessor="EditorImageProcessor"
                  :tabindex="-1"
                  class="editor"
                />
              </li>
            </ul>
          </template>

          <div
            v-if="rowErrorMessages[index].length"
            class="row-messages"
          >
            <ValidationMessage
              v-for="message in rowErrorMessages[index]"
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
          ref="addRowButton"
          :label="addRowBtn$()"
          @click="onAddRow"
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

      <EditableChipList
        ref="distractorList"
        addMode="button"
        :chips="state.distractors"
        :addLabel="addDistractorBtn$()"
        :listLabel="distractorsLabel$()"
        :chipLabel="number => editDistractorLabel$({ number })"
        :deleteLabel="number => deleteDistractorBtn$({ number })"
        :errorMessages="distractorErrorMessages"
        @open="onListOpen(OpenTarget.DISTRACTORS)"
        @close="onListClose(OpenTarget.DISTRACTORS)"
        @add-chip="addDistractor"
        @update-chip="onDistractorUpdate"
        @remove-chip="removeDistractor"
      />
    </div>
  </div>

</template>


<script>

  import { computed, nextTick, ref, watch } from 'vue';
  import groupBy from 'lodash/groupBy';
  import isEqual from 'lodash/isEqual';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { ValidationError } from '../../constants';
  import { useMatchInteraction } from '../../composables/useMatchInteraction';
  import ValidationMessage from '../../components/ValidationMessage/index.vue';
  import AddListItemButton from '../../components/AddListItemButton/index.vue';
  import ClickableRegion from '../../components/ClickableRegion/index.vue';
  import EditableChipList from '../../components/EditableChipList/index.vue';
  import ShuffledResponsePool from '../../components/ShuffledResponsePool/index.vue';
  import { hasRichTextContent, richTextComparisonKey } from '../../utils/richText';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  /** Which card or chip list currently holds the open TipTap editor. */
  const OpenTarget = Object.freeze({
    PROMPT: 'prompt',
    ROW: 'row',
    ANSWERS: 'answers',
    DISTRACTORS: 'distractors',
  });

  export default {
    name: 'MatchInteractionEditor',

    components: {
      TipTapEditor,
      ValidationMessage,
      AddListItemButton,
      ClickableRegion,
      EditableChipList,
      ShuffledResponsePool,
    },

    setup(props, { emit }) {
      const { windowIsLarge, windowIsSmall } = useKResponsiveWindow();
      const tokens = themeTokens();

      const {
        questionLabel$,
        editQuestionLabel$,
        errorPromptRequired$,
        matchingRowsLabel$,
        matchingRowsDescription$,
        promptColumnLabel$,
        answersColumnLabel$,
        answerPlaceholder$,
        addRowBtn$,
        deleteRowBtn$,
        editRowLabel$,
        rowAnswersLabel$,
        addMatchLabel$,
        editMatchLabel$,
        deleteMatchBtn$,
        distractorsLabel$,
        distractorsDescription$,
        addDistractorBtn$,
        deleteDistractorBtn$,
        editDistractorLabel$,
        responsePoolLabel$,
        errorTooFewRows$,
        errorEmptyRowContent$,
        errorRowWithoutMatch$,
        errorDuplicateRowContent$,
        errorDuplicateMatchContent$,
        errorDuplicateDistractorContent$,
        errorEmptyChoiceContent$,
      } = qtiEditorStrings;

      const questionTypeRef = computed(() => props.questionType);

      const {
        state,
        bodyXml,
        responseDeclarations,
        errors,
        addRow,
        removeRow,
        setRowContent,
        addMatch,
        removeMatch,
        setMatchContent,
        addDistractor,
        removeDistractor,
        setDistractorContent,
        setPrompt,
      } = useMatchInteraction(props.interaction, questionTypeRef);

      // At most one card or chip list holds an open TipTap editor at a time.
      const openTarget = ref(null);

      const addRowButton = ref(null);
      const deleteRowButtons = ref([]);
      const answerLists = ref([]);
      const distractorList = ref(null);

      function isOpen(kind) {
        return props.mode === 'edit' && openTarget.value?.kind === kind;
      }

      const isPromptOpen = computed(() => isOpen(OpenTarget.PROMPT));

      function isOpenInRow(kind, rowIndex) {
        return isOpen(kind) && openTarget.value.rowIndex === rowIndex;
      }

      function isRowPromptOpen(index) {
        return isOpenInRow(OpenTarget.ROW, index);
      }

      // A row is open while its prompt or its answer list holds the editor.
      function isRowOpen(index) {
        return isRowPromptOpen(index) || isOpenInRow(OpenTarget.ANSWERS, index);
      }

      // A prompt beside its answers leaves an open editor too narrow to hold its
      // toolbar on anything but a large screen, so the row being edited stacks.
      // A small screen is too narrow for the row even closed, so it stacks throughout.
      function isRowStacked(index) {
        return windowIsSmall.value || (!windowIsLarge.value && isRowOpen(index));
      }

      const showsAnswers = computed(() => props.mode === 'edit' || props.showAnswers);

      // A chip list commits its own editor as it closes: a written draft joins
      // it and a chip left blank drops out of it.
      function closeOpenTarget() {
        const target = openTarget.value;
        openTarget.value = null;
        if (target?.kind === OpenTarget.ANSWERS) answerLists.value[target.rowIndex].close();
        if (target?.kind === OpenTarget.DISTRACTORS) distractorList.value.close();
      }

      function onListOpen(kind, rowIndex = null) {
        releaseRepeats();
        if (isOpenInRow(kind, rowIndex)) return;
        closeOpenTarget();
        openTarget.value = { kind, rowIndex };
      }

      function onListClose(kind, rowIndex = null) {
        releaseRepeats();
        if (isOpenInRow(kind, rowIndex)) openTarget.value = null;
      }

      function openPrompt() {
        if (props.mode !== 'edit') return;
        closeOpenTarget();
        openTarget.value = { kind: OpenTarget.PROMPT };
      }

      function openRow(index) {
        if (props.mode !== 'edit') return;
        closeOpenTarget();
        openTarget.value = { kind: OpenTarget.ROW, rowIndex: index };
      }

      function onAddRow() {
        addRow();
        openRow(state.value.rows.length - 1);
      }

      // Open targets are held by index, so a deletion shifts the ones after it —
      // close the editor rather than let it land on a different item. The press
      // unmounts its own delete button, so focus moves to the row taking its place.
      async function onRemoveRow(index) {
        closeOpenTarget();
        removeRow(index);
        await nextTick();
        if (isOnlyRow.value) {
          addRowButton.value.$el.focus();
        } else {
          deleteRowButtons.value[Math.min(index, state.value.rows.length - 1)].$el.focus();
        }
      }

      const workingInteraction = computed(() => ({
        bodyXml: bodyXml.value,
        responseDeclarations: responseDeclarations.value,
      }));

      watch(
        () => props.mode,
        newMode => {
          // Leaving edit mode unmounts the chip lists, throwing a draft away
          // rather than committing it: the parent stops listening for updates,
          // so a commit would go unreported.
          if (newMode !== 'edit') {
            openTarget.value = null;
            return;
          }
          if (!hasRichTextContent(state.value.prompt)) {
            openPrompt();
          } else {
            openRow(0);
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

      const errorsByCode = computed(() => groupBy(errors.value, 'code'));
      const getErrorsWith = code => errorsByCode.value[code] || [];

      const promptHasError = computed(
        () => getErrorsWith(ValidationError.PROMPT_REQUIRED).length > 0,
      );
      const tooFewRowsError = computed(
        () => getErrorsWith(ValidationError.TOO_FEW_ROWS).length > 0,
      );

      const rowMessages = {
        [ValidationError.EMPTY_ROW_CONTENT]: errorEmptyRowContent$,
        [ValidationError.ROW_WITHOUT_MATCH]: errorRowWithoutMatch$,
        [ValidationError.DUPLICATE_ROW_CONTENT]: errorDuplicateRowContent$,
      };

      // Faults of the prompt itself, rather than of its answers, redden its card.
      const promptFaults = new Set([
        ValidationError.EMPTY_ROW_CONTENT,
        ValidationError.DUPLICATE_ROW_CONTENT,
      ]);

      const rowErrors = computed(() =>
        state.value.rows.map((_, index) =>
          errors.value.filter(e => rowMessages[e.code] && e.index === index),
        ),
      );

      const rowErrorMessages = computed(() =>
        rowErrors.value.map(rowErrs => rowErrs.map(e => rowMessages[e.code]())),
      );

      // Blankness is re-derived from the content rather than read off the
      // EMPTY_CHOICE_CONTENT error's id, because an id may repeat across choices.
      function isBlank(choice) {
        return !hasRichTextContent(choice.content);
      }

      function isRepeated(choice, texts) {
        return texts.size > 0 && texts.has(richTextComparisonKey(choice.content));
      }

      const liveRepeats = computed(() => ({
        distractors: new Set(
          getErrorsWith(ValidationError.DUPLICATE_DISTRACTOR_CONTENT).map(e => e.text),
        ),
        matches: state.value.rows.map(
          (_, index) =>
            new Set(
              getErrorsWith(ValidationError.DUPLICATE_MATCH_CONTENT)
                .filter(e => e.index === index)
                .map(e => e.text),
            ),
        ),
      }));

      // An open chip commits on the blur at mousedown, and a repeat it makes flags
      // other chips, moving the click target before mouseup. So repeats hold from
      // a chip's first update until an editor opens or closes.
      const heldRepeats = ref(null);
      const shownRepeats = computed(() => heldRepeats.value || liveRepeats.value);

      function holdRepeats() {
        if (!heldRepeats.value) heldRepeats.value = liveRepeats.value;
      }

      function releaseRepeats() {
        heldRepeats.value = null;
      }

      watch(openTarget, releaseRepeats);

      function onMatchUpdate(index, position, html) {
        holdRepeats();
        setMatchContent(index, position, html);
      }

      function onDistractorUpdate(position, html) {
        holdRepeats();
        setDistractorContent(position, html);
      }

      // An answer a distractor repeats is flagged too, as associate flags its pair.
      const matchErrorMessages = computed(() =>
        state.value.rows.map((row, index) =>
          row.matches.map(choice => {
            if (isBlank(choice)) return errorEmptyChoiceContent$();
            if (isRepeated(choice, shownRepeats.value.matches[index] || new Set())) {
              return errorDuplicateMatchContent$();
            }
            if (isRepeated(choice, shownRepeats.value.distractors)) {
              return errorDuplicateDistractorContent$();
            }
            return null;
          }),
        ),
      );

      const distractorErrorMessages = computed(() =>
        state.value.distractors.map(choice => {
          if (isBlank(choice)) return errorEmptyChoiceContent$();
          if (isRepeated(choice, shownRepeats.value.distractors))
            return errorDuplicateDistractorContent$();
          return null;
        }),
      );

      function getBorderStyle(hasError) {
        return { borderColor: hasError ? tokens.error : tokens.fineLine };
      }

      const rowPromptStyles = computed(() =>
        rowErrors.value.map((rowErrs, index) =>
          isRowPromptOpen(index) ? {} : getBorderStyle(rowErrs.some(e => promptFaults.has(e.code))),
        ),
      );

      const promptWrapperClass = computed(() =>
        isPromptOpen.value
          ? 'prompt-wrapper'
          : ['item-border', { 'is-clickable': props.mode === 'edit' }],
      );

      const promptWrapperStyle = computed(() =>
        isPromptOpen.value ? {} : getBorderStyle(promptHasError.value),
      );

      const isOnlyRow = computed(() => state.value.rows.length <= 1);

      // One option per association the learner can make: the emitted XML folds
      // answers holding the same content into a single option whose match-max is
      // the number of occurrences walked here. Blank answers are left unmarked:
      // every blank keys the same, so they would mark an unwritten option correct.
      const poolChoices = computed(() => [
        ...state.value.rows.flatMap(row =>
          row.matches.map(choice => ({
            content: choice.content,
            isCorrect: props.showAnswers && hasRichTextContent(choice.content),
          })),
        ),
        ...state.value.distractors.map(choice => ({ content: choice.content, isCorrect: false })),
      ]);

      return {
        EditorImageProcessor,
        OpenTarget,
        windowIsSmall,
        addRowButton,
        deleteRowButtons,
        answerLists,
        distractorList,
        state,
        isPromptOpen,
        promptWrapperClass,
        promptWrapperStyle,
        openPrompt,
        closeOpenTarget,
        isRowPromptOpen,
        isRowStacked,
        showsAnswers,
        openRow,
        onListOpen,
        onListClose,
        setRowContent,
        addMatch,
        removeMatch,
        onMatchUpdate,
        addDistractor,
        removeDistractor,
        onDistractorUpdate,
        setPrompt,
        onAddRow,
        onRemoveRow,
        promptHasError,
        tooFewRowsError,
        rowErrorMessages,
        matchErrorMessages,
        distractorErrorMessages,
        rowPromptStyles,
        isOnlyRow,
        poolChoices,
        questionLabel$,
        editQuestionLabel$,
        errorPromptRequired$,
        matchingRowsLabel$,
        matchingRowsDescription$,
        promptColumnLabel$,
        answersColumnLabel$,
        answerPlaceholder$,
        addRowBtn$,
        deleteRowBtn$,
        editRowLabel$,
        rowAnswersLabel$,
        addMatchLabel$,
        editMatchLabel$,
        deleteMatchBtn$,
        distractorsLabel$,
        distractorsDescription$,
        addDistractorBtn$,
        deleteDistractorBtn$,
        editDistractorLabel$,
        responsePoolLabel$,
        errorTooFewRows$,
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

  // Width of a small KIconButton, so the column headers line up with the rows.
  $actions-width: 32px;

  // An editable row's padding and border, likewise.
  $row-inset: 9px;

  .match-layout {
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

  .column-headers {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 8px;
    font-size: 12px;
    font-weight: 600;

    &.is-editable {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) $actions-width;
      padding: 0 $row-inset;
    }
  }

  .rows-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  // Prompt and answers take half the row each.
  .match-row {
    display: grid;
    grid-template-areas:
      'prompt answers'
      'message message';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);

    // Column-only: the message row track exists even when empty, so a row gap
    // would pad every row without a message.
    column-gap: 8px;
    align-items: center;
    border-radius: 4px;

    &.is-editable {
      grid-template-areas:
        'prompt answers actions'
        'message message message';
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) $actions-width;
      padding: 8px;
      background-color: v-bind('$themePalette.grey.v_50');
      border: 1px solid v-bind('$themeTokens.fineLine');
    }

    &.is-stacked {
      grid-template-areas:
        'prompt-label'
        'prompt'
        'answers-label'
        'answers'
        'message';
      grid-template-columns: minmax(0, 1fr);
    }

    &.is-stacked.is-editable {
      grid-template-areas:
        'prompt-label prompt-label'
        'prompt actions'
        'answers-label answers-label'
        'answers answers'
        'message message';
      grid-template-columns: minmax(0, 1fr) $actions-width;
    }
  }

  // Unbordered stacked rows need extra room to read as separate rows.
  .match-row.is-stacked:not(.is-editable) + .match-row {
    margin-top: 8px;
  }

  .row-label {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 600;
  }

  .prompt-label {
    grid-area: prompt-label;
  }

  .answers-label {
    grid-area: answers-label;
    margin-top: 8px;
  }

  // The prompt card sits on the tinted row, so it carries the surface colour
  // itself, and stretches to its answers' height. As a grid, it stretches the
  // slot wrapper inside it to that height too.
  .row-prompt {
    display: grid;
    grid-area: prompt;
    align-self: stretch;
    min-width: 0;
    background-color: v-bind('$themeTokens.surface');

    .editor {
      flex: 1;
    }

    .item-card-text {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0;

      &.is-closed {
        min-height: 40px;

        // Keep the closed text centred in the stretched card.
        .editor {
          flex: none;
        }
      }
    }
  }

  // Like the prompt card, the answer box sits on the tinted row.
  .row-answers {
    grid-area: answers;
    align-self: stretch;
    min-width: 0;
    background-color: v-bind('$themeTokens.surface');
  }

  .row-actions {
    display: flex;
    grid-area: actions;
    align-items: center;
  }

  // Read-only answers wrap in their column.
  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  // A chip is a compact pill, so its editor has no padding of its own.
  .chip {
    display: flex;
    align-items: center;
    min-width: 0;
    max-width: 100%;
    padding: 4px 12px;
    background-color: v-bind('$themeTokens.surface');
    border: 1px solid;
    border-radius: 8px;
  }

  // A pill sized by its content, so the grid cell must not stretch it.
  .view-prompt {
    grid-area: prompt;
    justify-self: start;
  }

  .row-messages {
    display: flex;
    flex-direction: column;
    grid-area: message;
    gap: 4px;
    margin-top: 8px;
  }

  .editor {
    width: 100%;
  }

</style>
