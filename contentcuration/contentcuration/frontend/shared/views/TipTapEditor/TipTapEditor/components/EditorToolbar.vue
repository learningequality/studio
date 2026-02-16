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
      :items="toolbarGroups"
      class="overflow-list"
    >
      <template #item="{ item }">
        <!-- Text formatting -->
        <div
          v-if="item.name === 'textFormat'"
          role="group"
          :aria-label="item.ariaLabel"
          class="toolbar-group"
        >
          <ToolbarButton
            v-for="action in textActions"
            :key="action.name"
            :title="action.title"
            :icon="action.icon"
            :is-active="action.isActive"
            @click="action.handler"
          />
        </div>

        <!-- Copy/Paste -->
        <div
          v-else-if="item.name === 'clipboard'"
          role="group"
          :aria-label="item.ariaLabel"
          class="toolbar-group"
        >
          <ToolbarButton
            :title="copy$()"
            :icon="require('../../assets/icon-copy.svg')"
            @click="handleCopy"
          />
          <PasteDropdown />
        </div>

        <!-- Clear Format -->
        <div
          v-else-if="item.name === 'clearFormat'"
          class="toolbar-group"
        >
          <ToolbarButton
            :title="clearFormatting$()"
            :icon="require('../../assets/icon-clearFormat.svg')"
            :is-available="canClearFormat"
            @click="handleClearFormat"
          />
        </div>

        <!-- Lists -->
        <div
          v-else-if="item.name === 'lists'"
          role="group"
          :aria-label="item.ariaLabel"
          class="toolbar-group"
        >
          <ToolbarButton
            v-for="list in listActions"
            :key="list.name"
            :title="list.title"
            :icon="list.icon"
            :rtl-icon="list.rtlIcon"
            :should-flip-in-rtl="list.name === 'bulletList'"
            :is-active="list.isActive"
            @click="list.handler"
          />
        </div>

        <!-- Script formatting -->
        <div
          v-else-if="item.name === 'script'"
          role="group"
          :aria-label="item.ariaLabel"
          class="toolbar-group"
        >
          <ToolbarButton
            v-for="script in scriptActions"
            :key="script.name"
            :title="script.title"
            :icon="script.icon"
            :rtl-icon="script.rtlIcon"
            :is-active="script.isActive"
            @click="script.handler"
          />
        </div>

        <!-- Insert tools -->
        <div
          v-else-if="item.name === 'insert'"
          role="group"
          :aria-label="item.ariaLabel"
          class="toolbar-group"
        >
          <ToolbarButton
            v-for="tool in insertTools"
            :key="tool.name"
            :title="tool.title"
            :icon="tool.icon"
            :is-active="tool.isActive"
            @click="onToolClick(tool, $event)"
          />
        </div>
      </template>

      <template #divider>
        <ToolbarDivider />
      </template>

      <template #more="{ overflowItems }">
        <div
          ref="moreDropdownContainer"
          class="more-dropdown-container"
          role="group"
          :aria-label="'More options'"
        >
          <button
            ref="moreButton"
            class="more-button"
            :title="'More options'"
            :class="{ active: isMoreDropdownOpen }"
            :aria-expanded="isMoreDropdownOpen"
            aria-haspopup="menu"
            aria-controls="more-options-menu"
            @click="toggleMoreDropdown"
          >
            <span>{{ moreButtonText$() }}</span>
            <img
              :src="require('../../assets/icon-chevron-down.svg')"
              aria-hidden="true"
              class="more-button-icon"
              :class="{ rotated: isMoreDropdownOpen }"
            >
          </button>

          <div
            v-show="isMoreDropdownOpen"
            id="more-options-menu"
            ref="moreDropdown"
            class="more-dropdown"
            role="menu"
            :aria-label="'Additional formatting options'"
            @click.stop="isMoreDropdownOpen = false"
            @keydown="handleMenuKeydown"
          >
            <!-- Overflow Text Formatting -->
            <template v-if="overflowItems.some(i => i.name === 'textFormat')">
              <button
                v-for="action in textActions"
                :key="action.name"
                class="dropdown-item"
                :class="{ active: action.isActive }"
                role="menuitem"
                @click="action.handler"
              >
                <img
                  :src="action.icon"
                  class="dropdown-item-icon"
                  alt=""
                  aria-hidden="true"
                >
                <span class="dropdown-item-text">{{ action.title }}</span>
              </button>
            </template>

            <!-- Overflow Clipboard -->
            <template v-if="overflowItems.some(i => i.name === 'clipboard')">
              <button
                class="dropdown-item"
                role="menuitem"
                @click="handleCopy"
              >
                <img
                  :src="require('../../assets/icon-copy.svg')"
                  class="dropdown-item-icon"
                  alt=""
                  aria-hidden="true"
                >
                <span class="dropdown-item-text">{{ copy$() }}</span>
              </button>
              <button
                v-for="option in pasteOptions"
                :key="option.name"
                class="dropdown-item"
                role="menuitem"
                @click="option.handler"
              >
                <img
                  :src="option.icon"
                  class="dropdown-item-icon"
                  alt=""
                  aria-hidden="true"
                >
                <span class="dropdown-item-text">{{ option.title }}</span>
              </button>
            </template>

            <!-- Overflow Clear Format -->
            <template v-if="overflowItems.some(i => i.name === 'clearFormat')">
              <button
                class="dropdown-item"
                role="menuitem"
                :disabled="!canClearFormat"
                @click="handleClearFormat"
              >
                <img
                  :src="require('../../assets/icon-clearFormat.svg')"
                  class="dropdown-item-icon"
                  alt=""
                  aria-hidden="true"
                >
                <span class="dropdown-item-text">{{ clearFormatting$() }}</span>
              </button>
            </template>

            <!-- Overflow Lists -->
            <template v-if="overflowItems.some(i => i.name === 'lists')">
              <button
                v-for="list in listActions"
                :key="list.name"
                class="dropdown-item"
                role="menuitem"
                :class="{ active: list.isActive }"
                :aria-pressed="list.isActive"
                @click="list.handler"
              >
                <img
                  :src="list.icon"
                  class="dropdown-item-icon"
                  alt=""
                  aria-hidden="true"
                >
                <span class="dropdown-item-text">{{ list.title }}</span>
              </button>
            </template>

            <!-- Overflow Script -->
            <template v-if="overflowItems.some(i => i.name === 'script')">
              <button
                v-for="script in scriptActions"
                :key="script.name"
                class="dropdown-item"
                role="menuitem"
                :class="{ active: script.isActive }"
                :aria-pressed="script.isActive"
                @click="script.handler"
              >
                <img
                  :src="script.icon"
                  class="dropdown-item-icon"
                  alt=""
                  aria-hidden="true"
                >
                <span class="dropdown-item-text">{{ script.title }}</span>
              </button>
            </template>

            <!-- Overflow Insert Tools -->
            <template v-if="overflowItems.some(i => i.name === 'insert')">
              <button
                v-for="tool in insertTools"
                :key="tool.name"
                class="dropdown-item"
                role="menuitem"
                :class="{ active: tool.isActive }"
                @click="onToolClick(tool, $event)"
              >
                <img
                  :src="tool.icon"
                  class="dropdown-item-icon"
                  alt=""
                  aria-hidden="true"
                >
                <span class="dropdown-item-text">{{ tool.title }}</span>
              </button>
            </template>
          </div>
        </div>
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

  import { defineComponent, ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
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
      const moreButton = ref(null);
      const moreDropdown = ref(null);
      const moreDropdownContainer = ref(null);
      const isMoreDropdownOpen = ref(false);

      const {
        handleCopy,
        handleClearFormat,
        canClearFormat,
        historyActions,
        textActions,
        listActions,
        scriptActions,
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
        scriptFormatting$,
        insertTools$,
        clearFormatting$,
        moreButtonText$,
      } = getTipTapEditorStrings();

      // Toolbar groups in visual order (left-to-right).
      // KListWithOverflow will collapse items from the end first.
      // Note: Don't include dividers here - KListWithOverflow renders
      // them automatically via #divider slot.
      const toolbarGroups = computed(() => [
        { name: 'textFormat', ariaLabel: textStyleFormatting$() },
        { name: 'clipboard', ariaLabel: copyAndPasteActions$() },
        { name: 'clearFormat' },
        { name: 'lists', ariaLabel: listFormatting$() },
        { name: 'script', ariaLabel: scriptFormatting$() },
        { name: 'insert', ariaLabel: insertTools$() },
      ]);

      const onToolClick = (tool, event) => {
        isMoreDropdownOpen.value = false;
        let target = event.currentTarget;

        // If the tool is in the overflow menu (clicked from dropdown), center the modal
        const isFromOverflow = moreDropdown.value?.contains(event.target);
        if (isFromOverflow) target = null;

        if (tool.name === 'image') {
          emit('insert-image', target);
        } else if (tool.name === 'link') {
          emit('insert-link');
        } else if (tool.name === 'math') {
          emit('insert-math', target);
        } else {
          // For all other buttons, call their original handler
          tool.handler();
        }
      };

      const toggleMoreDropdown = () => {
        isMoreDropdownOpen.value = !isMoreDropdownOpen.value;
      };

      // Handle keyboard navigation in dropdown menu
      const handleMenuKeydown = async event => {
        if (event.key === 'Escape') {
          isMoreDropdownOpen.value = false;
          // Return focus to the more button
          await nextTick();
          moreButton.value?.focus();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const menuItems = Array.from(
            moreDropdown.value?.querySelectorAll('[role="menuitem"]:not(:disabled)') || [],
          );
          const currentIndex = menuItems.indexOf(document.activeElement);

          let nextIndex;
          if (event.key === 'ArrowDown') {
            nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
          }

          menuItems[nextIndex]?.focus();
        }
      };

      // Close dropdown when clicking outside
      const handleClickOutside = event => {
        if (moreDropdownContainer.value && !moreDropdownContainer.value.contains(event.target)) {
          isMoreDropdownOpen.value = false;
        }
      };

      onMounted(() => {
        document.addEventListener('click', handleClickOutside, { passive: true });
      });

      onUnmounted(() => {
        document.removeEventListener('click', handleClickOutside);
      });

      return {
        toolbarRef,
        moreButton,
        moreDropdown,
        moreDropdownContainer,
        isMoreDropdownOpen,
        toolbarGroups,
        handleCopy,
        handleClearFormat,
        onToolClick,
        toggleMoreDropdown,
        handleMenuKeydown,
        canClearFormat,
        historyActions,
        textActions,
        listActions,
        scriptActions,
        insertTools,
        minimizeAction,
        pasteOptions,
        copy$,
        textFormattingToolbar$,
        historyActions$,
        textFormattingOptions$,
        clearFormatting$,
        moreButtonText$,
      };
    },
  });

</script>


<style scoped>

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

  /* Clip items that wrap during resize recalculation to prevent flicker */
  .overflow-list ::v-deep .list {
    overflow: hidden;
  }

  .toolbar-group {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .more-dropdown-container {
    position: relative;
  }

  .more-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 1000;
    min-width: 220px;
    max-height: 400px;
    padding: 4px 0;
    margin-top: 4px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    font-size: 1.2rem;
    color: #374151;
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;
    transition: background-color 0.15s ease;
  }

  .dropdown-item:hover,
  .dropdown-item:focus {
    background-color: #f3f4f6;
    outline: none;
  }

  .dropdown-item.active {
    color: #3730a3;
    background-color: #e0e7ff;
  }

  .dropdown-item-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-right: 12px;
  }

  .dropdown-item:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .dropdown-item:disabled:hover {
    background-color: transparent;
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

  .more-button.active {
    color: #4368f5;
    background: #d9e1fd;
  }

  .more-button-icon {
    width: 16px;
    height: 16px;
    margin-left: 4px;
    transition: transform 0.15s ease;
  }

  .more-button-icon.rotated {
    transform: rotate(180deg);
  }

  /* Ensure dropdown stays on screen */
  @media (max-width: 300px) {
    .more-dropdown {
      right: auto;
      left: 0;
    }
  }

</style>
