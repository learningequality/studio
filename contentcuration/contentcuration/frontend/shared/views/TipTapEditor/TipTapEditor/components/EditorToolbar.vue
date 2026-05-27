<template>

  <div
    ref="toolbarRef"
    class="toolbar"
    role="toolbar"
    :aria-label="textFormattingToolbar$()"
  >
    <!-- History buttons -->
    <div
      role="group"
      :aria-label="historyActions$()"
    >
      <ToolbarButton
        v-for="action in historyActions"
        :key="action.name"
        :title="action.title"
        :icon="action.icon"
        :is-available="action.isAvailable"
        :should-flip-in-rtl="true"
        @click="action.handler"
      />
    </div>

    <ToolbarDivider />

    <!-- Format dropdown -->
    <div
      role="group"
      :aria-label="textFormattingOptions$()"
    >
      <FormatDropdown />
    </div>

    <ToolbarDivider />

    <!-- Collapsible toolbar groups -->
    <KListWithOverflow
      :items="toolbarGroupsWithDividers"
      class="overflow-list"
    >
      <template #item="{ item }">
        <div
          :role="item.role"
          :aria-label="item.label"
          class="toolbar-group"
        >
          <template v-for="action in item.groupActions">
            <component
              :is="action.component"
              v-if="action.component"
              :key="`component-${action.name}`"
            />
            <ToolbarButton
              v-else
              :key="`button-${action.name}`"
              :title="action.title"
              :icon="action.icon"
              :is-active="action.isActive"
              :isAvailable="action.isAvailable"
              :rtlIcon="action.rtlIcon"
              :shouldFlipInRtl="action.shouldFlipInRtl"
              @click="action.handler"
            />
          </template>
        </div>
      </template>

      <template #divider>
        <div class="list-with-overflow-divider">
          <ToolbarDivider />
        </div>
      </template>

      <template #more="{ overflowItems }">
        <button class="more-button">
          <span>{{ moreButtonText$() }}</span>
          <img
            :src="require('../../assets/icon-chevron-down.svg')"
            aria-hidden="true"
            class="more-button-icon"
          >
          <KDropdownMenu
            :options="flatOverflowOptions(overflowItems)"
            @select="onOverflowSelect"
          >
            <template #option="{ option }">
              <div
                class="overflow-item"
                :class="{ active: option.isActive }"
              >
                <img
                  :src="option.icon"
                  class="dropdown-item-icon"
                  aria-hidden="true"
                >
                <span>{{ option.label }}</span>
              </div>
            </template>
          </KDropdownMenu>
        </button>
      </template>
    </KListWithOverflow>

    <ToolbarButton
      :title="minimizeAction.title"
      :icon="minimizeAction.icon"
      @click="minimizeAction.handler"
    />
  </div>

</template>


<script>

  import { defineComponent, ref, computed } from 'vue';
  import KListWithOverflow from 'kolibri-design-system/lib/KListWithOverflow.vue';
  import { useToolbarActions } from '../composables/useToolbarActions';
  import { getTipTapEditorStrings } from '../TipTapEditorStrings';
  import { useDropdowns } from '../composables/useDropdowns';
  import ToolbarButton from './toolbar/ToolbarButton.vue';
  import FormatDropdown from './toolbar/FormatDropdown.vue';
  import PasteDropdown from './toolbar/PasteDropdown.vue';
  import ToolbarDivider from './toolbar/ToolbarDivider.vue';

  export default defineComponent({
    name: 'EditorToolbar',
    components: {
      KListWithOverflow,
      ToolbarButton,
      FormatDropdown,
      PasteDropdown,
      ToolbarDivider,
    },
    setup(props, { emit }) {
      const toolbarRef = ref(null);

      const {
        handleCopy,
        handleClearFormat,
        canClearFormat,
        historyActions,
        textActions,
        listActions,
        insertTools,
        minimizeAction,
      } = useToolbarActions(emit);

      const { pasteOptions } = useDropdowns();

      const {
        copy$,
        textFormattingToolbar$,
        historyActions$,
        textFormattingOptions$,
        textStyleFormatting$,
        copyAndPasteActions$,
        listFormatting$,
        // scriptFormatting$,
        insertTools$,
        clearFormatting$,
        moreButtonText$,
      } = getTipTapEditorStrings();

      const onToolClick = (tool, event, { fromOverflow } = {}) => {
        const target = fromOverflow ? null : event.currentTarget;
        if (tool.name === 'image') {
          emit('insert-image', target);
        } else if (tool.name === 'link') {
          emit('insert-link');
        } else if (tool.name === 'math') {
          emit('insert-math', target);
        } else {
          tool.handler();
        }
      };

      // Toolbar groups in visual order (left-to-right).
      // KListWithOverflow will collapse items from the end first.
      // Note: Don't include dividers here - KListWithOverflow renders
      // them automatically via #divider slot.
      //
      // Each group describes its actions via `groupActions`. A `label` makes
      // the wrapper a role="group"; omitting it renders a plain div (for
      // single-action groups that don't need grouping semantics).
      // Actions with a `component` key render that component instead of a
      // ToolbarButton (e.g. PasteDropdown). Actions with an `onClick` key
      // receive the click event; otherwise `handler()` is called.
      const toolbarGroups = computed(() => [
        {
          name: 'textFormat',
          role: 'group',
          label: textStyleFormatting$(),
          groupActions: textActions.value,
        },
        {
          name: 'clipboard',
          role: 'group',
          label: copyAndPasteActions$(),
          groupActions: [
            {
              name: 'copy',
              title: copy$(),
              icon: require('../../assets/icon-copy.svg'),
              handler: handleCopy,
            },
            {
              name: 'pasteDropdown',
              component: PasteDropdown,
              dropdownActions: pasteOptions.value,
            },
          ],
        },
        // Perseus flavoured markdown does not support alignment,
        // so we disable this for now until we stop using markdown as the primary target
        // {
        //   name: 'align',
        //   groupActions: [alignAction.value]
        // },
        {
          name: 'clearFormat',
          groupActions: [
            {
              name: 'clearFormat',
              title: clearFormatting$(),
              icon: require('../../assets/icon-clearFormat.svg'),
              isAvailable: canClearFormat.value,
              handler: handleClearFormat,
            },
          ],
        },
        {
          name: 'lists',
          role: 'group',
          label: listFormatting$(),
          groupActions: listActions.value,
        },
        // Perseus flavoured markdown does not support super and sub script,
        // so we disable this for now until we stop using markdown as the primary target
        // {
        //   name: 'script',
        //   role: 'group',
        //   label: scriptFormatting$(),
        //   groupActions: scriptActions.value
        // },
        {
          name: 'insert',
          role: 'group',
          label: insertTools$(),
          groupActions: insertTools.value.map(tool => ({
            ...tool,
            handler: (e, { fromOverflow } = {}) => onToolClick(tool, e, { fromOverflow }),
          })),
        },
      ]);

      // Flattens the visible overflow groups into a KDropdownMenu-compatible
      // options array. Maps `title` → `label` and `isAvailable` → `disabled`.
      // Actions with `dropdownActions` (e.g. PasteDropdown) are expanded into
      // their constituent items; other component-only actions are skipped.
      const flatOverflowOptions = overflowItems => {
        const options = [];
        const toOption = a => ({
          ...a,
          label: a.title,
          disabled: a.isAvailable !== undefined ? !a.isAvailable : false,
        });

        for (const group of overflowItems) {
          if (group.type === 'divider') {
            options.push(group);
            continue;
          }
          for (const action of group.groupActions) {
            if (action.dropdownActions) {
              for (const dropdownAction of action.dropdownActions) {
                options.push(toOption(dropdownAction));
              }
            } else {
              options.push(toOption(action));
            }
          }
        }

        return options;
      };

      const toolbarGroupsWithDividers = computed(() => {
        const groups = [];
        toolbarGroups.value.forEach((group, index) => {
          groups.push(group);
          if (index < toolbarGroups.value.length - 1) {
            groups.push({ type: 'divider' });
          }
        });
        return groups;
      });

      const onOverflowSelect = (option, event) => {
        event.stopPropagation();
        option.handler(event, { fromOverflow: true });
      };

      return {
        toolbarRef,
        toolbarGroupsWithDividers,
        flatOverflowOptions,
        historyActions,
        minimizeAction,
        onOverflowSelect,
        textFormattingToolbar$,
        historyActions$,
        textFormattingOptions$,
        moreButtonText$,
      };
    },
  });

</script>


<style lang="scss" scoped>

  .toolbar {
    position: relative;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px;
    background: #f8f9fa;
    border-bottom: 1px solid #e1e5e9;
    border-radius: 8px 8px 0 0;
  }

  .toolbar > :last-child {
    margin-left: auto;
  }

  [role='group'] {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .overflow-list {
    flex: 1;
    min-width: 0;
  }

  .toolbar-group {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .dropdown-item-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .more-button {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    cursor: pointer;
    border: 0;
    border-radius: 4px;
    transition: background-color 0.15s ease;
  }

  .more-button:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  .more-button[aria-expanded='true'] {
    color: #4368f5;
    background: #d9e1fd;
  }

  .more-button-icon {
    width: 16px;
    height: 16px;
    margin-left: 4px;
    transition: transform 0.15s ease;
  }

  .more-button[aria-expanded='true'] .more-button-icon {
    transform: rotate(180deg);
  }

  .overflow-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 8px 12px;
    font-size: 1.2rem;
    line-height: 140%;

    &.active {
      color: #3730a3;
      background-color: #e0e7ff;
    }
  }

  .list-with-overflow-divider {
    padding: 0 6px;
  }

</style>
