<template>

  <div
    ref="toolbarRef"
    class="toolbar"
    role="toolbar"
    :style="{
      backgroundColor: $themePalette.grey.v_50,
      borderBottom: `1px solid ${$themeTokens.fineLine}`,
    }"
    :aria-label="textFormattingToolbar$()"
  >
    <!-- History buttons -->
    <div
      role="group"
      class="toolbar-group"
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
    <template v-if="!inlineOnly">
      <div
        role="group"
        class="formatting-group toolbar-group"
        :aria-label="textFormattingOptions$()"
      >
        <FormatDropdown />
      </div>

      <ToolbarDivider />
    </template>

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
          :data-group="item.name"
        >
          <template v-for="action in item.groupActions">
            <component
              :is="action.component"
              v-if="action.component"
              :key="`component-${action.name}`"
              :collapsed="isCollapsed(item)"
            />
            <ToolbarButton
              v-else
              :key="`button-${action.name}`"
              :title="action.title"
              :icon="action.icon"
              :kIcon="action.kIcon"
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
        <ToolbarMoreButton
          ref="moreButton"
          :overflowItems="overflowItems"
          @update:overflowItems="onCollapse"
          @release-focus="focusFirstRestored"
        />
      </template>
    </KListWithOverflow>

    <!-- `aria-disabled` rather than `disabled`, which would drop its tab stop. In a small window
         it shows only its icon, for the toolbar to fit. -->
    <KButton
      v-for="action in prominentInsertTools"
      :key="action.name"
      class="prominent-button"
      :class="{ 'icon-only': windowIsSmall }"
      primary
      appearance="raised-button"
      :text="windowIsSmall ? '' : action.title"
      :title="action.title"
      :aria-label="windowIsSmall ? action.title : null"
      :icon="action.kIcon"
      data-toolbar-item
      :aria-disabled="String(!action.isAvailable)"
      :appearanceOverrides="action.isAvailable ? {} : unavailableProminentStyle"
      @mousedown.native.prevent
      @click="action.handler()"
    />

    <ToolbarButton
      class="minimize-button"
      :title="minimizeAction.title"
      :icon="minimizeAction.icon"
      @click="minimizeAction.handler"
    />
  </div>

</template>


<script>

  import { ref, computed, inject, nextTick } from 'vue';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { useToolbarActions } from '../composables/useToolbarActions';
  import { getTipTapEditorStrings } from '../TipTapEditorStrings';
  import { useRovingTabIndex } from '../composables/useRovingTabIndex';
  import ToolbarButton from './toolbar/ToolbarButton.vue';
  import FormatDropdown from './toolbar/FormatDropdown.vue';
  import PasteDropdown from './toolbar/PasteDropdown.vue';
  import ToolbarDivider from './toolbar/ToolbarDivider.vue';
  import ToolbarMoreButton from './toolbar/ToolbarMoreButton.vue';

  export default {
    name: 'EditorToolbar',
    components: {
      ToolbarButton,
      FormatDropdown,
      PasteDropdown,
      ToolbarDivider,
      ToolbarMoreButton,
    },
    setup(props, { emit }) {
      const toolbarRef = ref(null);
      useRovingTabIndex(toolbarRef);
      const inlineOnly = inject('inlineOnly', false);
      const { windowIsSmall } = useKResponsiveWindow();

      const {
        handleCopy,
        handleClearFormat,
        canClearFormat,
        historyActions,
        alignActions,
        textActions,
        listActions,
        insertTools,
        minimizeAction,
        scriptActions,
        pasteActions,
      } = useToolbarActions(emit);

      const {
        copy$,
        textFormattingToolbar$,
        historyActions$,
        textFormattingOptions$,
        textStyleFormatting$,
        copyAndPasteActions$,
        listFormatting$,
        scriptFormatting$,
        insertTools$,
        clearFormatting$,
      } = getTipTapEditorStrings();

      const onInsertToolClick = (tool, event, { fromOverflow } = {}) => {
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
      // Note: Don't include dividers here - this will be the source of truth.

      // Each group describes its actions via `groupActions`. A `label` makes
      // the wrapper a role="group"; omitting it renders a plain div (for
      // single-action groups that don't need grouping semantics).
      // Actions with a `component` key render that component instead of a
      // ToolbarButton (e.g. PasteDropdown), told whether its group has collapsed into More.
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
              dropdownActions: pasteActions.value,
            },
          ],
        },
        {
          name: 'align',
          groupActions: alignActions.value,
        },
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
        {
          name: 'script',
          role: 'group',
          label: scriptFormatting$(),
          groupActions: scriptActions.value,
        },
        {
          name: 'insert',
          role: 'group',
          label: insertTools$(),
          groupActions: insertTools.value
            .filter(tool => !tool.prominent)
            .map(tool => ({
              ...tool,
              handler: (e, { fromOverflow } = {}) => onInsertToolClick(tool, e, { fromOverflow }),
            })),
        },
      ]);

      // Outside KListWithOverflow, so they never collapse into More.
      const prominentInsertTools = computed(() => insertTools.value.filter(tool => tool.prominent));
      // An unavailable action keeps its colour on hover, so it doesn't offer a click.
      const unavailableProminentStyle = { ':hover': { backgroundColor: themeTokens().primary } };

      const collapsedGroups = ref([]);
      const isCollapsed = group => collapsedGroups.value.some(({ name }) => name === group.name);

      // KListWithOverflow hides a collapsed group in place, so a control in it loses the focus,
      // and so does a menu one of them opened, once it closes. More now holds those controls.
      const moreButton = ref(null);
      const holdsFocus = group =>
        group.contains(document.activeElement) ||
        Boolean(group.querySelector('[aria-expanded="true"]'));
      const onCollapse = async groups => {
        // Unset while More renders with the toolbar, when nothing can hold the focus yet.
        const groupEls = toolbarRef.value?.querySelectorAll('.toolbar-group') ?? [];
        const lostFocus = Array.from(groupEls).some(
          group => window.getComputedStyle(group).visibility === 'hidden' && holdsFocus(group),
        );
        collapsedGroups.value = groups;
        if (lostFocus) {
          await nextTick();
          moreButton.value.$el.focus();
        }
      };
      // More, going once every group fits again, emits this before reporting none collapsed,
      // so `collapsedGroups` still holds the groups now restored.
      const focusFirstRestored = () => {
        // Unset once More goes with the whole toolbar, which has nowhere to put the focus.
        if (!toolbarRef.value) {
          return;
        }
        const [{ name }] = collapsedGroups.value;
        toolbarRef.value.querySelector(`[data-group="${name}"] [data-toolbar-item]`).focus();
      };

      /**
       * Place a divider element between toolbar groups in the overflow menu.
       * This is necessary to tell KListWithOverflow where to render dividers
       * between groups.
       */
      const toolbarGroupsWithDividers = computed(() => {
        const groups = [];
        const nonEmptyGroups = toolbarGroups.value.filter(group => group.groupActions.length);
        nonEmptyGroups.forEach((group, index) => {
          groups.push(group);
          if (index < nonEmptyGroups.length - 1) {
            groups.push({ type: 'divider' });
          }
        });
        return groups;
      });

      return {
        toolbarRef,
        inlineOnly,
        toolbarGroupsWithDividers,
        isCollapsed,
        moreButton,
        onCollapse,
        focusFirstRestored,
        historyActions,
        prominentInsertTools,
        unavailableProminentStyle,
        windowIsSmall,
        minimizeAction,
        textFormattingToolbar$,
        historyActions$,
        textFormattingOptions$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .toolbar {
    position: relative;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px;

    /* A last resort: the overflow list gives up tools first, but too narrow a window can
       still leave what remains wider than the toolbar. */
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 8px 8px 0 0;
  }

  /* Never narrower than More, which would otherwise overlap minimize. */
  .overflow-list {
    flex: 2;
    min-width: min-content;
  }

  /* Visible items stay out of min-content, so they can still collapse. */
  .overflow-list ::v-deep .list {
    flex-grow: 1;
    width: 0;
    min-width: 0;
  }

  /* Never collapses into More; the overflow list gives up tools instead. */
  .toolbar .prominent-button {
    flex: none;
  }

  .prominent-button.icon-only {
    min-width: 36px;
    padding: 0 6px;

    /* KButton keeps its empty label, with a margin that would push the icon off centre. */
    ::v-deep .link-text {
      display: none;
    }
  }

  /* Matches the disabled toolbar buttons. */
  .prominent-button[aria-disabled='true'] {
    cursor: not-allowed;
    box-shadow: none;
    opacity: 0.3;
  }

  .toolbar-group {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .formatting-group {
    /* Let it shrink if possible */
    flex: 1;
    flex-grow: 0;
  }

  .list-with-overflow-divider {
    padding: 0 6px;
  }

</style>
