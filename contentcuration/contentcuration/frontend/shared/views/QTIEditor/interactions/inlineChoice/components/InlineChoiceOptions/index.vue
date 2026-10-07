<template>

  <KFocusTrap
    @shouldFocusFirstEl="focusFirstEl"
    @shouldFocusLastEl="focusLastEl"
  >
    <!-- Drawn inline below the passage, but it traps focus, so it is a modal dialog. Focusable
         from script only, so a click on its heading or padding keeps focus, and Escape, in it. -->
    <div
      ref="panel"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-label="inlineChoiceOptionsDialogLabel$({ number })"
      class="options-panel"
      @focusout="onFocusout"
      @keydown="onHistoryKeydown"
      @keydown.esc.stop="$emit('close')"
    >
      <ValidationMessage v-if="hasNoCorrectAnswer">
        {{ errorNoCorrectAnswer$() }}
      </ValidationMessage>
      <div class="options-header">
        <h4
          :id="headerId"
          class="field-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ inlineChoiceOptionsLabel$() }}
        </h4>
        <KIconButton
          icon="close"
          size="small"
          :ariaLabel="closeInlineChoiceOptions$()"
          :tooltip="closeInlineChoiceOptions$()"
          :color="$themePalette.grey.v_700"
          @click="$emit('close')"
        />
      </div>

      <!-- A group role would override the <ol>'s list role, so grouping sits on this wrapper. -->
      <KRadioButtonGroup :aria-labelledby="headerId">
        <DraggableRegion
          :items="dropdown.options"
          :sortable="reorderable"
          @update:items="options => $emit('update', { options })"
        >
          <!-- role is explicit: `list-style: none` drops the implicit one in Safari -->
          <ol
            class="options-list"
            role="list"
          >
            <DraggableItem
              v-for="(option, index) in dropdown.options"
              :key="option.id"
            >
              <li
                class="option-border"
                :style="optionStyle(option.id)"
              >
                <div class="option-row">
                  <DraggableHandle v-if="reorderable">
                    <div class="option-drag">
                      <DragSortWidget
                        :color="$themePalette.grey.v_700"
                        :isFirst="index === 0"
                        :isLast="index === dropdown.options.length - 1"
                        :itemLabel="inlineChoiceOptionLabel$({ number: index + 1 })"
                        :position="index + 1"
                        :total="dropdown.options.length"
                        @moveUp="moveOption(index, -1)"
                        @moveDown="moveOption(index, 1)"
                      />
                    </div>
                  </DraggableHandle>

                  <!-- An invalid option shows the error icon in place of its selection control -->
                  <div class="option-selection">
                    <KIcon
                      v-if="hasError(option.id)"
                      icon="error"
                      class="option-error-icon"
                      :color="$themeTokens.error"
                    />
                    <KRadioButton
                      v-else
                      class="margin-0"
                      :currentValue="dropdown.correctId || ''"
                      :buttonValue="option.id"
                      :label="markInlineChoiceOptionCorrect$({ number: index + 1 })"
                      :showLabel="false"
                      :style="{ width: 'auto' }"
                      :color="$themePalette.green.v_600"
                      @change="$emit('update', { correctId: option.id })"
                    />
                  </div>

                  <input
                    :ref="el => setInputRef(option.id, el)"
                    :value="option.text"
                    :aria-label="inlineChoiceOptionLabel$({ number: index + 1 })"
                    :aria-invalid="String(hasError(option.id))"
                    :aria-describedby="errorIdsOf(option.id)"
                    class="option-input"
                    :class="
                      $computedClass({
                        ':focus': { ...$coreOutline, 'outline-offset': '-2px' },
                      })
                    "
                    dir="auto"
                    @beforeinput="onBeforeInput"
                    @input="setOptionText(option.id, $event.target.value)"
                  >

                  <KIconButton
                    icon="close"
                    :ariaLabel="deleteInlineChoiceOptionBtn$({ number: index + 1 })"
                    :tooltip="deleteInlineChoiceOptionBtn$({ number: index + 1 })"
                    :disabled="isOnlyOption"
                    :color="isOnlyOption ? $themeTokens.textDisabled : $themePalette.grey.v_700"
                    @click="removeOption(option.id)"
                  />
                </div>
                <ValidationMessage
                  v-if="isEmpty(option.id)"
                  :id="errorId(option.id, 'empty')"
                  class="option-validation-message"
                >
                  {{ errorEmptyChoiceContent$() }}
                </ValidationMessage>
                <ValidationMessage
                  v-if="isDuplicate(option.id)"
                  :id="errorId(option.id, 'duplicate')"
                  class="option-validation-message"
                >
                  {{ errorDuplicateChoiceContent$() }}
                </ValidationMessage>
              </li>
            </DraggableItem>
          </ol>
        </DraggableRegion>
      </KRadioButtonGroup>

      <AddListItemButton
        :label="addInlineChoiceOptionBtn$()"
        :aria-label="addInlineChoiceOptionBtn$()"
        @click="addOption"
      />
    </div>
  </KFocusTrap>

</template>


<script>

  import { computed, nextTick, ref } from 'vue';
  import { themePalette, themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { qtiEditorStrings } from '../../../../qtiEditorStrings';
  import { ValidationError } from '../../../../constants';
  import { generateRandomSlug } from '../../../../utils/generateRandomSlug';
  import ValidationMessage from '../../../../components/ValidationMessage/index.vue';
  import AddListItemButton from '../../../../components/AddListItemButton/index.vue';
  import { historyShortcut } from '../../historyShortcut';
  import DraggableRegion from 'shared/views/dragSort/DraggableRegion.vue';
  import DraggableItem from 'shared/views/dragSort/DraggableItem.vue';
  import DraggableHandle from 'shared/views/dragSort/DraggableHandle.vue';
  import DragSortWidget from 'shared/views/dragSort/DragSortWidget/index.vue';
  import { getFirstFocusableElement, getLastFocusableElement } from 'shared/utils/focusUtils';

  /**
   * The options of one inline choice dropdown. Every edit is emitted as an `update` of
   * `{ options?, correctId? }`, for the passage to apply to the chip. Undo and redo in the
   * panel are emitted as `undo` and `redo`, for the passage's history to apply.
   */
  export default {
    name: 'InlineChoiceOptions',

    components: {
      ValidationMessage,
      AddListItemButton,
      DraggableRegion,
      DraggableItem,
      DraggableHandle,
      DragSortWidget,
    },

    setup(props, { emit }) {
      const {
        inlineChoiceOptionsLabel$,
        inlineChoiceOptionsDialogLabel$,
        closeInlineChoiceOptions$,
        inlineChoiceOptionLabel$,
        markInlineChoiceOptionCorrect$,
        addInlineChoiceOptionBtn$,
        deleteInlineChoiceOptionBtn$,
        errorNoCorrectAnswer$,
        errorEmptyChoiceContent$,
        errorDuplicateChoiceContent$,
      } = qtiEditorStrings;

      const palette = themePalette();
      const tokens = themeTokens();

      const headerId = generateRandomSlug('inline-choice-options');

      const idsWith = code => new Set(props.errors.filter(e => e.code === code).map(e => e.id));
      const emptyIds = computed(() => idsWith(ValidationError.EMPTY_CHOICE_CONTENT));
      const duplicateIds = computed(() => idsWith(ValidationError.DUPLICATE_CHOICE_CONTENT));
      const isEmpty = id => emptyIds.value.has(id);
      const isDuplicate = id => duplicateIds.value.has(id);
      const hasError = id => isEmpty(id) || isDuplicate(id);
      const hasNoCorrectAnswer = computed(() =>
        idsWith(ValidationError.NO_CORRECT_ANSWER).has(props.dropdown.responseIdentifier),
      );

      const isOnlyOption = computed(() => props.dropdown.options.length <= 1);

      // A field is described by its errors, so they are read with it rather than only once.
      const errorId = (id, kind) => `${headerId}-${id}-${kind}`;
      function errorIdsOf(id) {
        const ids = [];
        if (isEmpty(id)) ids.push(errorId(id, 'empty'));
        if (isDuplicate(id)) ids.push(errorId(id, 'duplicate'));
        return ids.length ? ids.join(' ') : null;
      }

      function optionStyle(id) {
        const isCorrect = id === props.dropdown.correctId;
        let borderColor = tokens.fineLine;
        if (hasError(id)) {
          borderColor = tokens.error;
        } else if (isCorrect) {
          borderColor = palette.green.v_500;
        }
        return {
          borderColor,
          backgroundColor: isCorrect ? palette.green.v_50 : tokens.surface,
        };
      }

      const inputRefs = {};
      function setInputRef(id, el) {
        if (el) inputRefs[id] = el;
        else delete inputRefs[id];
      }

      function setOptionText(id, text) {
        emit('update', {
          options: props.dropdown.options.map(o => (o.id === id ? { ...o, text } : o)),
        });
      }

      /** Focuses the option at `index`, or the last one when there are fewer now. */
      function focusOptionAt(index) {
        const { options } = props.dropdown;
        const option = options[Math.min(index, options.length - 1)];
        if (option) inputRefs[option.id]?.focus();
      }

      // Undoing an Add option, or redoing a Remove, takes the focused option with it; focus then
      // stays in the panel, as on a removal.
      async function stepHistory(direction, control) {
        const index = props.dropdown.options.findIndex(o =>
          inputRefs[o.id]?.closest('li').contains(control),
        );
        emit(direction);
        await nextTick();
        if (panel.value && !panel.value.contains(document.activeElement)) focusOptionAt(index);
      }

      // Only the passage's history applies: the field's own would record its undos as edits.
      // The shortcuts are the passage editor's, caught as keys: the panel is outside the editor,
      // whose keymap never sees them, and as a field's own undo never runs, its redo never has
      // anything to redo, and the browser sends no `historyRedo`.
      function onHistoryKeydown(event) {
        const direction = historyShortcut(event);
        if (!direction) return;
        event.preventDefault();
        stepHistory(direction, event.target);
      }

      // The browser's Edit menu still goes through the field's history.
      function onBeforeInput(event) {
        if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
          event.preventDefault();
          stepHistory(event.inputType === 'historyUndo' ? 'undo' : 'redo', event.target);
        }
      }

      async function addOption() {
        const option = { id: generateRandomSlug('choice'), text: '' };
        emit('update', { options: [...props.dropdown.options, option] });
        await nextTick();
        inputRefs[option.id]?.focus();
      }

      // Its remove button goes with it, so focus moves to the option now in its place, or the
      // last one, rather than out of the panel.
      async function removeOption(id) {
        if (isOnlyOption.value) return;
        const index = props.dropdown.options.findIndex(o => o.id === id);
        emit('update', { options: props.dropdown.options.filter(o => o.id !== id) });
        await nextTick();
        focusOptionAt(index);
      }

      function moveOption(index, offset) {
        const options = [...props.dropdown.options];
        const target = index + offset;
        if (target < 0 || target >= options.length) return;
        [options[index], options[target]] = [options[target], options[index]];
        emit('update', { options });
      }

      const panel = ref(null);

      // Where focus last left the panel from and to, for the moment the trap acts on it.
      let lastExit = null;
      function onFocusout(event) {
        lastExit = { from: event.target, to: event.relatedTarget };
        setTimeout(() => {
          lastExit = null;
        });
      }

      function focusFirstEl() {
        const first = getFirstFocusableElement(panel.value);
        // KFocusTrap asks for the first control until focus has been tabbed into it, which never
        // happens here: the panel opens with focus put on an option. So Shift+Tab from the first
        // control asks for it too, and should wrap to the last, as it does afterwards.
        const isLeavingFirst =
          lastExit && lastExit.from === first && !panel.value.contains(lastExit.to);
        if (isLeavingFirst) focusLastEl();
        else first?.focus();
      }

      function focusLastEl() {
        getLastFocusableElement(panel.value)?.focus();
      }

      /** Moves focus into the options list, at its first option. */
      function focusOptions() {
        const [first] = props.dropdown.options;
        if (first) inputRefs[first.id]?.focus();
      }

      return {
        panel,
        headerId,
        isEmpty,
        isDuplicate,
        hasError,
        errorId,
        errorIdsOf,
        hasNoCorrectAnswer,
        isOnlyOption,
        optionStyle,
        setInputRef,
        onHistoryKeydown,
        onBeforeInput,
        setOptionText,
        addOption,
        removeOption,
        moveOption,
        onFocusout,
        focusFirstEl,
        focusLastEl,
        // Public: lets the editor move focus into the list as the panel opens.
        // eslint-disable-next-line vue/no-unused-properties
        focusOptions,
        inlineChoiceOptionsLabel$,
        inlineChoiceOptionsDialogLabel$,
        closeInlineChoiceOptions$,
        inlineChoiceOptionLabel$,
        markInlineChoiceOptionCorrect$,
        addInlineChoiceOptionBtn$,
        deleteInlineChoiceOptionBtn$,
        errorNoCorrectAnswer$,
        errorEmptyChoiceContent$,
        errorDuplicateChoiceContent$,
      };
    },

    props: {
      /** @type {import('../../parse').InlineChoiceDropdown} */
      dropdown: {
        type: Object,
        required: true,
      },
      /** The dropdown's position in the passage, counting from 1 */
      number: {
        type: Number,
        required: true,
      },
      /** Whether the options can be reordered; not while they are shuffled */
      reorderable: {
        type: Boolean,
        default: true,
      },
      /** The question's validation errors */
      errors: {
        type: Array,
        default: () => [],
      },
    },

    emits: ['update', 'undo', 'redo', 'close'],
  };

</script>


<style lang="scss" scoped>

  .options-panel {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .options-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* A heading, so its own margins are set rather than inherited from the UA stylesheet */
  .field-label {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  /* Opaque, so a row dragged over the rows beneath it stays readable */
  .option-border {
    padding: 0 7.5px;
    border: 1px solid;
    border-radius: 4px;
  }

  /* Flex row: [drag] [selection] [text] [remove] */
  .option-row {
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 48px;
  }

  .option-drag {
    display: flex;
    flex-shrink: 0;
    align-items: center;
  }

  .margin-0 {
    margin: 0 !important;
  }

  /* KRadioButton wraps its 24px control in a table with block margins, which push it off
     the row centre, out of line with the drag handle. */
  .option-selection {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    line-height: 0;
  }

  .option-error-icon {
    top: 0;
    width: 24px;
    height: 24px;
  }

  /* Reads as text until it is focused for editing */
  .option-input {
    flex: 1;
    min-width: 0;
    padding: 8px;
    font: inherit;
    color: var(--tokens-text);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 2px;

    &:focus {
      background-color: var(--tokens-surface);
      border-color: var(--tokens-fineLine);
    }
  }

  .option-validation-message {
    padding: 0 0 7.5px;
  }

</style>
