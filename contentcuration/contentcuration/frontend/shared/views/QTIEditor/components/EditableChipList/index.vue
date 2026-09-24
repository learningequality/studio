<template>

  <ClickableRegion
    ref="rootEl"
    :class="['pool-box', { 'is-region': addMode === 'region', 'is-addable': isRegionActive }]"
    :style="{ borderColor: $themeTokens.fineLine }"
    :suppressed="!isRegionActive"
    :ariaLabel="addLabel"
    textCursor
    @click="openDraft"
  >
    <div class="pool-content">
      <ul
        class="chip-list"
        :aria-label="listLabel"
      >
        <li
          v-for="(chip, index) in chips"
          :key="`${chip.id}-${index}`"
          class="chip-item"
          :class="{ 'is-editing': isChipOpen(index) }"
        >
          <ClickableRegion
            :class="{ chip: !isChipOpen(index) }"
            :style="chipStyles[index]"
            :suppressed="isChipOpen(index)"
            :aria-label="chipLabel(index + 1)"
            @click="openChip(index)"
          >
            <div class="chip-body">
              <div class="chip-content">
                <span
                  v-if="showsPlaceholder(index)"
                  :style="{ color: $themeTokens.annotation }"
                >
                  {{ placeholder }}
                </span>
                <TipTapEditor
                  v-else
                  :value="chip.content"
                  :mode="isChipOpen(index) ? 'edit' : 'view'"
                  format="html"
                  :padding="isChipOpen(index) ? 'default' : 'none'"
                  :minHeight="'48px'"
                  :autofocus="isChipOpen(index)"
                  :imageProcessor="EditorImageProcessor"
                  :tabindex="-1"
                  class="editor"
                  @update="html => onChipUpdate(index, html)"
                  @minimize="close"
                />
              </div>

              <!-- `@click.stop` so removing the chip does not also open it -->
              <div
                class="chip-actions"
                @click.stop
              >
                <KIconButton
                  ref="deleteButtons"
                  icon="close"
                  size="small"
                  :disabled="!canRemove"
                  :ariaLabel="deleteLabel(index + 1)"
                  :tooltip="deleteLabel(index + 1)"
                  :color="canRemove ? $themePalette.grey.v_700 : $themeTokens.textDisabled"
                  @click="event => onRemove(index, event)"
                />
              </div>
            </div>
          </ClickableRegion>
          <ValidationMessage v-if="showsError(index)">
            {{ errorMessages[index] }}
          </ValidationMessage>
        </li>
      </ul>

      <!--
        A new chip is written below the list and joins it when saved or when its
        editor closes, so the list never holds a half-written chip. Clicks stop
        here for the same reason they stop on the add button.
      -->
      <div
        v-if="isDraftOpen"
        class="draft-row"
        @click.stop
      >
        <div class="draft-editor">
          <TipTapEditor
            :key="draftKey"
            :value="open.content"
            mode="edit"
            format="html"
            :minHeight="'48px'"
            autofocus
            :imageProcessor="EditorImageProcessor"
            :tabindex="-1"
            class="editor"
            @update="onDraftUpdate"
            @minimize="close"
          />
        </div>
        <KButton
          :text="saveChipBtn$()"
          appearance="flat-button"
          :primary="true"
          @click="onSave"
        />
        <!-- Numbered for the place it would take, so it reads as this row's
             remove button while doubling as the way to abandon the draft. -->
        <KIconButton
          icon="close"
          size="small"
          :ariaLabel="deleteLabel(chips.length + 1)"
          :tooltip="deleteLabel(chips.length + 1)"
          :color="$themePalette.grey.v_700"
          @click="onDiscard"
        />
      </div>

      <!--
        The editor this opens mounts before the click finishes bubbling, and
        TipTap closes on any click outside itself — so the click stops here.
      -->
      <div
        v-if="addMode === 'button'"
        @click.stop
      >
        <AddListItemButton
          ref="addButton"
          :label="addLabel"
          @click="openDraft"
        />
      </div>
    </div>
  </ClickableRegion>

</template>


<script>

  import { computed, nextTick, ref } from 'vue';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import AddListItemButton from '../AddListItemButton/index.vue';
  import ClickableRegion from '../ClickableRegion/index.vue';
  import ValidationMessage from '../ValidationMessage/index.vue';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { hasRichTextContent } from '../../utils/richText';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  export default {
    name: 'EditableChipList',

    components: {
      AddListItemButton,
      ClickableRegion,
      ValidationMessage,
      TipTapEditor,
    },

    setup(props, { emit }) {
      const tokens = themeTokens();
      const { saveChipBtn$ } = qtiEditorStrings;

      const rootEl = ref(null);
      const addButton = ref(null);
      const deleteButtons = ref([]);

      // The chip whose editor is open — `index` null for a new one — holding its
      // content as last written, since the chip prop lags a render behind.
      const open = ref(null);

      // A TipTap editor takes focus only as it mounts, so bumping this key on every
      // add press remounts the draft editor — patched in place it leaves focus behind.
      const draftKey = ref(0);

      const isDraftOpen = computed(() => open.value?.index === null);

      // A click inside an open editor bubbles up to the box, and must not start a draft.
      const isRegionActive = computed(() => props.addMode === 'region' && !open.value);

      const canRemove = computed(() => props.chips.length > props.minChips);

      function isChipOpen(index) {
        return open.value?.index === index;
      }

      function showsPlaceholder(index) {
        return (
          Boolean(props.placeholder) &&
          !isChipOpen(index) &&
          !hasRichTextContent(props.chips[index].content)
        );
      }

      // Content commits on the blur at mousedown; an error shown then would move
      // the click target before mouseup.
      function showsError(index) {
        return Boolean(props.errorMessages[index]) && !isChipOpen(index);
      }

      const chipStyles = computed(() =>
        props.chips.map((_, index) => ({
          borderColor: showsError(index) ? tokens.error : tokens.fineLine,
        })),
      );

      // Where focus goes once nothing nearer is left to take it.
      function getAddControl() {
        return props.addMode === 'region' ? rootEl.value : addButton.value.$el;
      }

      /**
       * Closing an editor is what commits it: a written draft joins the list, and
       * a chip left blank drops out of it. Returns the index of a dropped chip,
       * which shifts the ones after it.
       */
      function commit() {
        const target = open.value;
        open.value = null;
        if (!target) return null;
        const isBlank = !hasRichTextContent(target.content);
        if (target.index === null) {
          if (!isBlank) emit('add-chip', target.content);
          return null;
        }
        if (!isBlank || !canRemove.value) return null;
        emit('remove-chip', target.index);
        return target.index;
      }

      // Public: the parent closes this list's editor when it opens another.
      function close() {
        if (!open.value) return;
        commit();
        emit('close');
      }

      // Where a chip at `index` sits once the chip at `dropped` has left the list.
      function shiftPast(dropped, index) {
        return dropped !== null && dropped < index ? index - 1 : index;
      }

      function openChip(index) {
        const { content } = props.chips[index];
        const dropped = commit();
        open.value = { index: shiftPast(dropped, index), content };
        emit('open');
      }

      function openDraft() {
        commit();
        draftKey.value += 1;
        open.value = { index: null, content: '' };
        emit('open');
      }

      function onChipUpdate(index, html) {
        if (isChipOpen(index)) open.value = { index, content: html };
        emit('update-chip', index, html);
      }

      function onDraftUpdate(html) {
        open.value = { index: null, content: html };
      }

      // Closing an editor re-enables the region, and a native click lets that render
      // run before the click bubbles on — unmounting any wrapper that would stop it.
      // So the buttons that close one stop their own click.

      // The press that removes a chip unmounts its own delete button, dropping focus
      // to the body. Hand focus to the chip taking its place, or to the add control.
      async function onRemove(index, event) {
        event.stopPropagation();
        const wasOpen = open.value !== null;
        const dropped = commit();
        const target = shiftPast(dropped, index);
        if (dropped !== index) emit('remove-chip', target);
        if (wasOpen) emit('close');
        await nextTick();
        if (canRemove.value) {
          deleteButtons.value[Math.min(target, props.chips.length - 1)].$el.focus();
        } else {
          getAddControl().focus();
        }
      }

      async function onSave(event) {
        event.stopPropagation();
        close();
        await nextTick();
        getAddControl().focus();
      }

      async function onDiscard(event) {
        event.stopPropagation();
        open.value = null;
        emit('close');
        await nextTick();
        getAddControl().focus();
      }

      return {
        EditorImageProcessor,
        rootEl,
        addButton,
        deleteButtons,
        open,
        draftKey,
        isDraftOpen,
        isRegionActive,
        canRemove,
        isChipOpen,
        showsPlaceholder,
        showsError,
        chipStyles,
        // eslint-disable-next-line vue/no-unused-properties
        close,
        openChip,
        openDraft,
        onChipUpdate,
        onDraftUpdate,
        onRemove,
        onSave,
        onDiscard,
        saveChipBtn$,
      };
    },

    props: {
      /** @type {Array<{ id: String, content: String }>} */
      chips: {
        type: Array,
        required: true,
      },
      /** 'button' renders an AddListItemButton; 'region' makes the whole box clickable. */
      addMode: {
        type: String,
        default: 'button',
        validator: val => ['button', 'region'].includes(val),
      },
      /** Add button label, or the region's accessible name */
      addLabel: {
        type: String,
        required: true,
      },
      /** Accessible name of the chip list */
      listLabel: {
        type: String,
        required: true,
      },
      /** (position: Number) => String — 1-based; accessible label for editing a chip */
      chipLabel: {
        type: Function,
        required: true,
      },
      /** (position: Number) => String — 1-based; accessible label for deleting a chip */
      deleteLabel: {
        type: Function,
        required: true,
      },
      /** Parallel to `chips`; null where a chip has no error */
      errorMessages: {
        type: Array,
        default: () => [],
      },
      /** Fewest chips the list keeps: at this count none can be removed */
      minChips: {
        type: Number,
        default: 0,
      },
      /** Shown in a closed chip that has no content */
      placeholder: {
        type: String,
        default: '',
      },
    },

    emits: ['open', 'close', 'add-chip', 'update-chip', 'remove-chip'],
  };

</script>


<style lang="scss" scoped>

  .pool-box {
    padding: 12px;
    border: 1px solid;
    border-radius: 4px;

    // An empty list still needs a target to click.
    &.is-region {
      min-height: 64px;
    }

    &.is-addable {
      cursor: text;
    }
  }

  .pool-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  // A chip is a compact pill, so its editor has no padding of its own. An open
  // chip drops the class, leaving its editor to draw the border.
  .chip {
    min-width: 0;
    max-width: 100%;
    padding: 4px 12px;
    cursor: pointer;
    background-color: v-bind('$themePalette.grey.v_50');
    border: 1px solid;
    border-radius: 8px;
    transition: background-color 0.3s;

    &:hover {
      background-color: v-bind('$themeTokens.fineLine');
    }
  }

  .chip-body {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
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
  // flagged chip pushes the chips after it along rather than down.
  .chip-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 100%;

    &.is-editing {
      flex-basis: 100%;
    }
  }

  // A blank choice renders nothing, so without a floor the chip collapses to a
  // strip too small to click.
  .chip-content {
    flex: 1;
    min-width: 24px;
    min-height: 24px;
  }

  .editor {
    width: 100%;
  }

</style>
