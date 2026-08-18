<template>

  <div>
    <div class="hints-header">
      <h4 class="hints-heading">
        <button
          class="hints-header-button"
          :aria-expanded="sectionOpen.toString()"
          :aria-controls="contentId"
          @click="sectionOpen = !sectionOpen"
        >
          <span class="hints-label">
            {{ hintsLabel$() }}
          </span>
          <KIcon
            icon="dropdown"
            class="hints-chevron"
            :class="{ 'is-open': sectionOpen }"
          />
        </button>
      </h4>
      <div class="full-width-divider"></div>
    </div>

    <!--
      The controlled element stays in the document so the button's aria-controls always
      resolves; it is hidden rather than removed. What it holds is mounted only while open,
      because a rich-text editor per hint per question is not worth paying for unseen.
    -->
    <div
      :id="contentId"
      class="hints-section"
      :class="{ 'is-collapsed': !sectionOpen }"
      data-testid="hintsSectionContent"
    >
      <template v-if="sectionOpen">
        <div class="hints-list">
          <div
            v-if="!hints.length"
            class="hint-border no-hints-placeholder"
          >
            {{ noHintsPlaceholder$() }}
          </div>
          <ClickableRegion
            v-for="(hint, index) in hints"
            :key="hint.id"
            class="hint hint-border"
            :class="{ 'is-clickable': isHintClickable(hint.id) }"
            :suppressed="!isHintClickable(hint.id)"
            :ariaLabel="editHintLabel$({ number: index + 1 })"
            data-testid="hint"
            @click="onHintClick($event, hint.id)"
          >
            <div
              class="hint-card-text"
              :class="{ 'is-closed': !isHintOpen(hint.id), 'small-screen': windowIsSmall }"
            >
              <div
                class="hint-layout"
                :class="{ 'is-open': isHintOpen(hint.id), 'small-screen': windowIsSmall }"
              >
                <div class="hint-content">
                  <span
                    v-if="!isHintOpen(hint.id) && !hasContent(hint)"
                    class="hint-placeholder hint-view-text"
                  >
                    {{ hintPlaceholder$({ index: index + 1 }) }}
                  </span>
                  <TipTapEditor
                    v-else
                    :value="hint.content"
                    :mode="isHintOpen(hint.id) ? 'edit' : 'view'"
                    format="html"
                    minHeight="80px"
                    :autofocus="isHintOpen(hint.id)"
                    :imageProcessor="EditorImageProcessor"
                    :tabindex="-1"
                    class="editor"
                    @update="html => setHintContent(hint.id, html)"
                    @minimize="closeHint"
                  />
                </div>

                <div
                  v-if="mode === 'edit'"
                  class="hint-actions toolbar"
                  @click.stop
                >
                  <CollapsibleToolbar :actions="getHintRowActions(hint.id, index)" />
                </div>
              </div>
            </div>
          </ClickableRegion>
        </div>

        <AddListItemButton
          v-if="mode === 'edit'"
          :label="addHintBtn$()"
          :aria-label="addHintBtn$()"
          data-testid="addHintBtn"
          @click="onAddHint"
        />
      </template>
    </div>
  </div>

</template>


<script>

  import { ref } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { hintHasContent } from '../../serialization/hints';
  import { generateRandomSlug } from '../../utils/generateRandomSlug';
  import CollapsibleToolbar from '../CollapsibleToolbar/index.vue';
  import AddListItemButton from '../AddListItemButton/index.vue';
  import ClickableRegion from '../ClickableRegion/index.vue';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  export default {
    name: 'HintsSection',

    components: { CollapsibleToolbar, AddListItemButton, ClickableRegion, TipTapEditor },

    setup(props, { emit }) {
      const {
        hintsLabel$,
        noHintsPlaceholder$,
        hintPlaceholder$,
        editHintLabel$,
        addHintBtn$,
        deleteHintBtn$,
        moveHintUpBtn$,
        moveHintDownBtn$,
      } = qtiEditorStrings;

      const { windowIsSmall } = useKResponsiveWindow();

      const sectionOpen = ref(false);

      const openHintId = ref(null);

      const contentId = `${generateRandomSlug('hints')}-content`;

      function isHintOpen(id) {
        return props.mode === 'edit' && openHintId.value === id;
      }

      function hasContent(hint) {
        return hintHasContent(hint);
      }

      function isHintClickable(id) {
        return props.mode === 'edit' && !isHintOpen(id);
      }

      function emitHints(hints) {
        emit('update:hints', hints);
      }

      function closeHint() {
        openHintId.value = null;
      }

      function onHintClick(event, id) {
        if (props.mode !== 'edit' || isHintOpen(id)) {
          return;
        }
        // The toolbar's own buttons must not also open the hint they act on.
        if (event.target.closest('.toolbar')) {
          return;
        }
        openHintId.value = id;
      }

      function setHintContent(id, content) {
        const hint = props.hints.find(h => h.id === id);
        if (!hint || hint.content === content) {
          return;
        }
        emitHints(props.hints.map(h => (h.id === id ? { ...h, content } : h)));
      }

      function moveHint(id, offset) {
        const index = props.hints.findIndex(h => h.id === id);
        const target = index + offset;
        if (index < 0 || target < 0 || target >= props.hints.length) {
          return;
        }
        const hints = [...props.hints];
        [hints[index], hints[target]] = [hints[target], hints[index]];
        emitHints(hints);
      }

      function removeHint(id) {
        if (openHintId.value === id) {
          closeHint();
        }
        emitHints(props.hints.filter(h => h.id !== id));
      }

      function onAddHint() {
        const hint = { id: generateRandomSlug('hint'), content: '' };
        emitHints([...props.hints, hint]);
        sectionOpen.value = true;
        openHintId.value = hint.id;
      }

      function getHintRowActions(id, index) {
        return [
          {
            id: 'up',
            icon: 'chevronUp',
            label: moveHintUpBtn$(),
            disabled: index === 0,
            handler: () => moveHint(id, -1),
            collapsed: windowIsSmall.value,
          },
          {
            id: 'down',
            icon: 'chevronDown',
            label: moveHintDownBtn$(),
            disabled: index === props.hints.length - 1,
            handler: () => moveHint(id, 1),
            collapsed: windowIsSmall.value,
          },
          {
            id: 'delete',
            icon: 'close',
            label: deleteHintBtn$(),
            handler: () => removeHint(id),
            collapsed: windowIsSmall.value,
          },
        ];
      }

      return {
        sectionOpen,
        contentId,
        windowIsSmall,
        EditorImageProcessor,
        hintsLabel$,
        noHintsPlaceholder$,
        hintPlaceholder$,
        editHintLabel$,
        addHintBtn$,
        isHintOpen,
        hasContent,
        isHintClickable,
        onHintClick,
        setHintContent,
        closeHint,
        onAddHint,
        getHintRowActions,
      };
    },

    props: {
      /** Item hints, in order: [{ id, content }] */
      hints: {
        type: Array,
        default: () => [],
      },
      /** Whether the question card this sits in is being edited */
      mode: {
        type: String,
        default: 'view',
        validator: val => ['view', 'edit'].includes(val),
      },
    },

    emits: ['update:hints'],
  };

</script>


<style lang="scss" scoped>

  .full-width-divider {
    max-width: none !important;
    margin: 0 calc(-1 * var(--question-card-horizontal-padding, 20px)) 0;
    border-top: 1px solid v-bind('$themeTokens.fineLine');
  }

  .hints-header {
    user-select: none;
  }

  .hints-heading {
    margin: 0;
  }

  .hints-header-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: calc(100% + 2 * var(--question-card-horizontal-padding, 20px));
    padding: 15px var(--question-card-horizontal-padding, 20px);
    margin: 0 calc(-1 * var(--question-card-horizontal-padding, 20px)) 0;
    cursor: pointer;
    background: transparent;
    border: 0;

    &:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }

    /*
     * Inset, because this button is deliberately wider than the card it sits in — an
     * outline drawn outside its box has its left and right edges off the card, leaving
     * only two horizontal rules above and below the heading.
     */
    &:focus-visible {
      outline: 3px solid v-bind('$themeTokens.focusOutline');
      outline-offset: -3px;
    }
  }

  /* Matches the field labels the interaction editors use for "Question" and "Answers" */
  .hints-label {
    font-size: 14px;
    font-weight: 600;
    color: v-bind('$themePalette.grey.v_700');
  }

  .hints-chevron {
    font-size: 24px;
    transition: transform 0.2s ease;

    &.is-open {
      transform: rotate(180deg);
    }
  }

  .hints-section {
    margin-top: 10px;

    &.is-collapsed {
      display: none;
    }
  }

  .hints-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .hint-border {
    border: 1px solid v-bind('$themeTokens.fineLine');
    border-radius: 4px;
  }

  .no-hints-placeholder {
    padding: 16px;
  }

  .hint-card-text {
    padding: 16px;

    &.small-screen {
      padding: 8px;
    }

    &.is-closed {
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .hint-layout {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &.is-open {
      align-items: flex-start;
    }

    &.small-screen {
      .hint-actions {
        margin-left: 4px;
      }

      &.is-open {
        flex-direction: column-reverse;

        .hint-actions {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          margin-bottom: 8px;
          margin-left: 0;
        }
      }
    }
  }

  .hint-content {
    position: relative;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .hint-actions {
    flex-shrink: 0;
    margin-left: 16px;
  }

  .hint {
    transition: background-color 0.3s;

    &.is-clickable {
      cursor: pointer;

      &:hover {
        background-color: v-bind('$themePalette.grey.v_100');
      }
    }
  }

  .hint-view-text {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 42px;
    padding: 0 4px;
    overflow: hidden;
    border-radius: 4px;
  }

  .hint-placeholder {
    color: v-bind('$themePalette.grey.v_300');
  }

</style>
