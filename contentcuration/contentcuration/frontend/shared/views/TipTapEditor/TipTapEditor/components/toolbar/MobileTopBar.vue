<template>

  <div
    ref="toolbarRef"
    class="toolbar top-bar"
    role="toolbar"
    :aria-label="editorControls$()"
  >
    <div
      class="history-actions"
      role="group"
      :aria-label="historyActions$()"
    >
      <ToolbarButton
        v-for="action in historyActions"
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-available="action.isAvailable"
        @click="action.handler"
      />
    </div>

    <div class="topbar-actions">
      <button
        class="insert-button"
        data-toolbar-item
        :title="insertContent$()"
        :aria-label="insertContentMenu$()"
      >
        +
        <KDropdownMenu
          :options="insertOptions"
          @select="onInsertSelect"
        >
          <template #option="{ option }">
            <div class="insert-option">
              <img
                :src="option.icon"
                alt=""
                class="dropdown-icon"
                aria-hidden="true"
              >
              <span>{{ option.label }}</span>
            </div>
          </template>
        </KDropdownMenu>
      </button>
      <ToolbarButton
        :title="minimizeAction.title"
        :icon="minimizeAction.icon"
        @click="minimizeAction.handler"
      />
    </div>
  </div>

</template>


<script>

  import { defineComponent, computed, ref } from 'vue';
  import { useToolbarActions } from '../../composables/useToolbarActions';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';
  import { useRovingTabIndex } from '../../composables/useRovingTabIndex';
  import ToolbarButton from './ToolbarButton.vue';

  export default defineComponent({
    name: 'MobileTopBar',
    components: { ToolbarButton },
    setup(props, { emit }) {
      const toolbarRef = ref(null);

      useRovingTabIndex(toolbarRef);

      const { historyActions, insertTools, minimizeAction } = useToolbarActions(emit);

      // Get translation functions
      const { editorControls$, historyActions$, insertContent$, insertContentMenu$ } =
        getTipTapEditorStrings();

      const insertOptions = computed(() =>
        insertTools.value.map(tool => ({ ...tool, label: tool.title })),
      );

      const onInsertSelect = (option, event) => {
        // KDropdownMenu renders outside the editor, so this click would otherwise
        // reach the RTE's outside-click handler and minimize the editor.
        event.stopPropagation();
        // Nothing to anchor a modal to: the menu item is gone once the menu closes.
        option.handler(null);
      };

      return {
        historyActions,
        insertOptions,
        minimizeAction,
        onInsertSelect,
        toolbarRef,
        editorControls$,
        historyActions$,
        insertContent$,
        insertContentMenu$,
      };
    },
  });

</script>


<style scoped>

  .top-bar {
    display: flex;

    /* flex-shrink: 0; */
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .history-actions {
    display: flex;
    gap: 0.25rem;
  }

  .topbar-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .insert-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    min-width: 44px;
    height: 36px;
    min-height: 44px;
    font-size: 2.5rem;
    color: #666666;
    cursor: pointer;
    opacity: 0.8;
  }

  .insert-button:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  /* Matches the overflow menu on EditorToolbar */
  .insert-option {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 8px 12px;
    font-size: 1.2rem;
    line-height: 140%;
  }

  .dropdown-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

</style>
