<template>

  <div
    class="dropdown-container"
    @keydown="handleContainerKeydown"
  >
    <button
      ref="dropdownButton"
      class="format-dropdown"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :aria-label="textFormatOptions$()"
      @click="toggleDropdown"
      @keydown="handleButtonKeydown"
    >
      <span>{{ selectedFormat }}</span>
      <img
        :src="require('../../../assets/icon-chevron-down.svg')"
        alt=""
        class="dropdown-icon"
      >
    </button>
    <div
      v-if="isOpen"
      ref="dropdownMenu"
      class="dropdown-menu headers-dropdown"
      role="menu"
      :aria-label="formatOptions$()"
    >
      <div
        v-for="(format, index) in formatOptions"
        :key="format.value"
        :ref="el => setItemRef(el, index)"
        class="dropdown-item"
        role="menuitem"
        :tabindex="index === focusedIndex ? 0 : -1"
        :aria-selected="selectedFormat === format.label"
        @click="applyFormat(format)"
        @keydown="handleItemKeydown($event, index, format)"
      >
        <component
          :is="format.tag"
          v-text="format.label"
        />
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
    name: 'FormatDropdown',
    setup() {
      const {
        formatOptions,
        selectedFormat,
        showHeadersDropdown: isOpen,
        toggleHeadersDropdown: toggleDropdown,
        selectFormat,
      } = useDropdowns();

      const { handleFormatChange } = useToolbarActions();

      const {
        textFormatOptions$,
        formatOptions$,
      } = getTipTapEditorStrings();

      const dropdownButton = ref(null);
      const dropdownMenu = ref(null);
      const itemRefs = ref([]);
      const focusedIndex = ref(0);

      const setItemRef = (el, index) => {
        if (el) {
          itemRefs.value[index] = el;
        }
      };

      const applyFormat = format => {
        selectFormat(format);
        handleFormatChange(format.value);
        toggleDropdown();
        dropdownButton.value?.focus();
      };

      const handleButtonKeydown = async event => {
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
              focusedIndex.value = formatOptions.value.length - 1;
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

      const handleItemKeydown = (event, index, format) => {
        switch (event.key) {
          case 'Enter':
          case ' ':
            event.preventDefault();
            applyFormat(format);
            toggleDropdown();
            break;
          case 'ArrowDown':
            event.preventDefault();
            focusedIndex.value = (index + 1) % formatOptions.value.length;
            itemRefs.value[focusedIndex.value]?.focus();
            break;
          case 'ArrowUp':
            event.preventDefault();
            focusedIndex.value = index === 0 ? formatOptions.value.length - 1 : index - 1;
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
            focusedIndex.value = formatOptions.value.length - 1;
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
        selectedFormat,
        isOpen,
        formatOptions,
        dropdownButton,
        dropdownMenu,
        focusedIndex,
        toggleDropdown,
        applyFormat,
        setItemRef,
        handleButtonKeydown,
        handleItemKeydown,
        handleContainerKeydown,
        textFormatOptions$,
        formatOptions$,
      };
    },
  });

</script>


<style scoped>

  .dropdown-container {
    position: relative;
  }

  .format-dropdown {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    min-width: 80px;
    padding: 6px 8px;
    font-size: 14px;
    color: #495057;
    appearance: none;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 4px;
  }

  .format-dropdown:hover {
    background: #e6e6e6;
  }

  .format-dropdown:active {
    background: #d1d5da;
  }

  .format-dropdown:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
    outline-offset: 2px;
  }

  .dropdown-icon {
    width: 12px;
    height: 12px;
    opacity: 0.5;
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
    font-size: 14px;
    font-weight: 400;
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

  .dropdown-item[aria-selected='true'] {
    font-weight: 600;
    background: #e6f3ff;
  }

</style>
