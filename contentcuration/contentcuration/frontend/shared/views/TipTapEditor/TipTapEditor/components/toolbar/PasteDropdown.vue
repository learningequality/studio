<template>

  <div
    class="dropdown-container paste-button-container"
    @keydown="handleContainerKeydown"
  >
    <button
      class="paste-main-btn toolbar-btn"
      :title="paste$()"
      :aria-label="paste$()"
      @click="handlePaste"
      @keydown="handleMainButtonKeydown"
    >
      <img
        :src="require('../../../assets/icon-paste.svg')"
        alt=""
        class="toolbar-icon"
      >
    </button>
    <button
      ref="dropdownButton"
      class="paste-dropdown-btn"
      :title="pasteOptions$()"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :aria-label="pasteOptionsMenu$()"
      :class="{ active: isOpen }"
      @click="toggleDropdown"
      @keydown="handleDropdownButtonKeydown"
    >
      <img
        :src="require('../../../assets/icon-chevron-down.svg')"
        alt=""
        class="dropdown-arrow"
      >
    </button>
    <div
      v-if="isOpen"
      ref="dropdownMenu"
      class="dropdown-menu paste-dropdown"
      role="menu"
      :aria-label="pasteOptions$()"
    >
      <div
        v-for="(option, index) in pasteOptions"
        :key="option.name"
        :ref="el => setItemRef(el, index)"
        class="dropdown-item"
        role="menuitem"
        :tabindex="index === focusedIndex ? 0 : -1"
        @click="handleOptionClick(option)"
        @keydown="handleItemKeydown($event, index, option)"
      >
        <img
          :src="option.icon"
          :alt="option.title"
          class="dropdown-item-icon"
        >
        <span>{{ option.title }}</span>
      </div>
    </div>
  </div>

</template>


<script>

  import { defineComponent, ref, nextTick, watch } from 'vue';
  import { useDropdowns } from '../../composables/useDropdowns';
  import { useToolbarActions } from '../../composables/useToolbarActions';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';

  export default defineComponent({
    name: 'PasteDropdown',
    setup() {
      const {
        pasteOptions,
        showPasteDropdown: isOpen,
        togglePasteDropdown: toggleDropdown,
      } = useDropdowns();

      const { handlePaste } = useToolbarActions();

      const { paste$, pasteOptions$, pasteOptionsMenu$ } = getTipTapEditorStrings();

      const dropdownButton = ref(null);
      const dropdownMenu = ref(null);
      const itemRefs = ref([]);
      const focusedIndex = ref(0);

      const setItemRef = (el, index) => {
        if (el) {
          itemRefs.value[index] = el;
        }
      };

      const handleMainButtonKeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handlePaste();
        }
      };

      const handleDropdownButtonKeydown = async event => {
        switch (event.key) {
          case 'Enter':
          case ' ':
          case 'ArrowDown':
            event.preventDefault();
            if (!isOpen.value) {
              toggleDropdown();
              await nextTick();
              focusedIndex.value = 0;
              itemRefs.value[0]?.focus();
            }
            break;
          case 'ArrowUp':
            event.preventDefault();
            if (!isOpen.value) {
              toggleDropdown();
              await nextTick();
              focusedIndex.value = pasteOptions.value.length - 1;
              itemRefs.value[focusedIndex.value]?.focus();
            }
            break;
          case 'Escape':
            if (isOpen.value) {
              event.preventDefault();
              toggleDropdown();
            }
            break;
        }
      };

      const handleOptionClick = option => {
        option.handler();
        toggleDropdown();
        dropdownButton.value?.focus();
      };

      const handleItemKeydown = (event, index, option) => {
        switch (event.key) {
          case 'Enter':
          case ' ':
            event.preventDefault();
            handleOptionClick(option);
            break;
          case 'ArrowDown':
            event.preventDefault();
            focusedIndex.value = (index + 1) % pasteOptions.value.length;
            itemRefs.value[focusedIndex.value]?.focus();
            break;
          case 'ArrowUp':
            event.preventDefault();
            focusedIndex.value = index === 0 ? pasteOptions.value.length - 1 : index - 1;
            itemRefs.value[focusedIndex.value]?.focus();
            break;
          case 'Escape':
            event.preventDefault();
            toggleDropdown();
            dropdownButton.value?.focus();
            break;
          case 'Tab':
            // Allow natural tab behavior, but close dropdown
            toggleDropdown();
            break;
          case 'Home':
            event.preventDefault();
            focusedIndex.value = 0;
            itemRefs.value[0]?.focus();
            break;
          case 'End':
            event.preventDefault();
            focusedIndex.value = pasteOptions.value.length - 1;
            itemRefs.value[focusedIndex.value]?.focus();
            break;
        }
      };

      const handleContainerKeydown = event => {
        // Handle Escape at container level
        if (event.key === 'Escape' && isOpen.value) {
          event.stopPropagation();
          toggleDropdown();
          dropdownButton.value?.focus();
        }
      };

      // Watch for dropdown opening to manage focus
      watch(isOpen, async newValue => {
        if (newValue) {
          await nextTick();
          // Focus first item when dropdown opens
          focusedIndex.value = 0;
          itemRefs.value[0]?.focus();
        }
      });

      return {
        isOpen,
        pasteOptions,
        dropdownButton,
        dropdownMenu,
        focusedIndex,
        toggleDropdown,
        handlePaste,
        setItemRef,
        handleMainButtonKeydown,
        handleDropdownButtonKeydown,
        handleOptionClick,
        handleItemKeydown,
        handleContainerKeydown,
        paste$,
        pasteOptions$,
        pasteOptionsMenu$,
      };
    },
  });

</script>


<style scoped>

  .paste-button-container {
    position: relative;
    display: flex;
    overflow: visible;
    border-radius: 4px;
  }

  .dropdown-container {
    position: relative;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .toolbar-btn:hover {
    background: #e6e6e6;
  }

  .toolbar-btn:active {
    background: #dee2e6;
  }

  .toolbar-btn:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  .toolbar-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .paste-main-btn {
    width: 28px !important;
    border-radius: 4px 0 0 4px !important;
  }

  .paste-dropdown-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 32px;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 0 4px 4px 0;
    transition: background-color 0.2s ease;
  }

  .paste-dropdown-btn:hover {
    background: #e6e6e6;
  }

  .paste-dropdown-btn.active {
    background: #d9e1fd;
  }

  .paste-dropdown-btn.active .dropdown-arrow {
    filter: brightness(0) saturate(100%) invert(32%) sepia(97%) saturate(2640%) hue-rotate(230deg)
      brightness(103%) contrast(94%);
    opacity: 1;
  }

  .paste-dropdown-btn:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

  .dropdown-arrow {
    width: 15px;
    height: 15px;
    opacity: 0.9;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    min-width: 200px;
    margin-top: 4px;
    background: white;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .paste-dropdown {
    right: -12px;
    min-width: 250px;
  }

  .dropdown-item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    font-family:
      'Noto Sans',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
    line-height: 140%;
    color: #000000;
    cursor: pointer;
  }

  .dropdown-item:hover,
  .dropdown-item:focus {
    background: #f8f9fa;
    outline: none;
  }

  .dropdown-item:focus-visible {
    background: #e6f3ff;
    outline: 2px solid #0097f2;
    outline-offset: -2px;
  }

  .dropdown-item-icon {
    width: 18px;
    height: 18px;
    opacity: 0.7;
  }

</style>
