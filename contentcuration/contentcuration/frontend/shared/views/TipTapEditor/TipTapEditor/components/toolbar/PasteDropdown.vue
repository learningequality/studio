<template>
  <div class="paste-button-container dropdown-container" @keydown="handleContainerKeydown">
    <button 
      class="toolbar-btn paste-main-btn" 
      @click="handlePaste" 
      @keydown="handleMainButtonKeydown"
      title="Paste"
      aria-label="Paste"
    >
      <img :src="require('../../../assets/icon-paste.svg')" alt="" class="toolbar-icon">
    </button>
    <button 
      ref="dropdownButton"
      class="paste-dropdown-btn" 
      @click="toggleDropdown" 
      @keydown="handleDropdownButtonKeydown"
      title="Paste Options"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      aria-label="Paste options menu"
      :class="{ active: isOpen }"
    >
      <img :src="require('../../../assets/icon-chevron-down.svg')" alt="" class="dropdown-arrow">
    </button>
    <div 
      v-if="isOpen" 
      ref="dropdownMenu"
      class="dropdown-menu paste-dropdown"
      role="menu"
      aria-label="Paste options"
    >
      <div 
        v-for="(option, index) in pasteOptions" 
        :key="option.name"
        class="dropdown-item"
        role="menuitem"
        :tabindex="index === focusedIndex ? 0 : -1"
        :ref="el => setItemRef(el, index)"
        @click="handleOptionClick(option)"
        @keydown="handleItemKeydown($event, index, option)"
      >
        <img :src="option.icon" :alt="option.title" class="dropdown-item-icon">
        <span>{{ option.title }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, ref, nextTick, watch } from 'vue'
import { useDropdowns } from '../../composables/useDropdowns'
import { useToolbarActions } from '../../composables/useToolbarActions'

export default defineComponent({
  name: 'PasteDropdown',
  setup() {
    const { 
      showPasteDropdown: isOpen, 
      togglePasteDropdown: toggleDropdown 
    } = useDropdowns()

    const { handlePaste, handlePasteNoFormat } = useToolbarActions()

    const dropdownButton = ref(null)
    const dropdownMenu = ref(null)
    const itemRefs = ref([])
    const focusedIndex = ref(0)

    const pasteOptions = computed(() => [
      { 
        name: 'paste', 
        title: 'Paste', 
        icon: require('../../../assets/icon-paste.svg'), 
        handler: handlePaste 
      },
      { 
        name: 'pasteNoFormat', 
        title: 'Paste without formatting', 
        icon: require('../../../assets/icon-pasteNoFormat.svg'), 
        handler: handlePasteNoFormat 
      }
    ])

    const setItemRef = (el, index) => {
      if (el) {
        itemRefs.value[index] = el
      }
    }

    const handleMainButtonKeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handlePaste()
      }
    }

    const handleDropdownButtonKeydown = async (event) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
          event.preventDefault()
          if (!isOpen.value) {
            toggleDropdown()
            await nextTick()
            focusedIndex.value = 0
            itemRefs.value[0]?.focus()
          }
          break
        case 'ArrowUp':
          event.preventDefault()
          if (!isOpen.value) {
            toggleDropdown()
            await nextTick()
            focusedIndex.value = pasteOptions.value.length - 1
            itemRefs.value[focusedIndex.value]?.focus()
          }
          break
        case 'Escape':
          if (isOpen.value) {
            event.preventDefault()
            toggleDropdown()
          }
          break
      }
    }

    const handleOptionClick = (option) => {
      option.handler()
      toggleDropdown()
      dropdownButton.value?.focus()
    }

    const handleItemKeydown = (event, index, option) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault()
          handleOptionClick(option)
          break
        case 'ArrowDown':
          event.preventDefault()
          focusedIndex.value = (index + 1) % pasteOptions.value.length
          itemRefs.value[focusedIndex.value]?.focus()
          break
        case 'ArrowUp':
          event.preventDefault()
          focusedIndex.value = index === 0 ? pasteOptions.value.length - 1 : index - 1
          itemRefs.value[focusedIndex.value]?.focus()
          break
        case 'Escape':
          event.preventDefault()
          toggleDropdown()
          dropdownButton.value?.focus()
          break
        case 'Tab':
          // Allow natural tab behavior, but close dropdown
          toggleDropdown()
          break
        case 'Home':
          event.preventDefault()
          focusedIndex.value = 0
          itemRefs.value[0]?.focus()
          break
        case 'End':
          event.preventDefault()
          focusedIndex.value = pasteOptions.value.length - 1
          itemRefs.value[focusedIndex.value]?.focus()
          break
      }
    }

    const handleContainerKeydown = (event) => {
      // Handle Escape at container level
      if (event.key === 'Escape' && isOpen.value) {
        event.stopPropagation()
        toggleDropdown()
        dropdownButton.value?.focus()
      }
    }

    // Watch for dropdown opening to manage focus
    watch(isOpen, async (newValue) => {
      if (newValue) {
        await nextTick()
        // Focus first item when dropdown opens
        focusedIndex.value = 0
        itemRefs.value[0]?.focus()
      }
    })

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
      handleContainerKeydown
    }
  }
})
</script>

<style scoped>
.paste-button-container {
  display: flex;
  position: relative;
  border-radius: 4px;
  overflow: visible;
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
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toolbar-btn:hover {
  background: #e6e6e6;
}

.toolbar-btn:active {
  background: #dee2e6;
}

.toolbar-btn:focus-visible {
  outline: 2px solid #0097F2;
  outline-offset: 2px;
  border-radius: 4px;
  background: #e6e6e6;
}

.toolbar-icon {
  width: 17px;
  height: 17px;
  opacity: 0.7;
}

.paste-main-btn {
  border-radius: 4px 0 0 4px !important;
  width: 28px !important;
}

.paste-dropdown-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-left: 1px solid #dee2e6;
}

.paste-dropdown-btn:hover {
  background: #e6e6e6;
}

.paste-dropdown-btn.active {
  background: #D9E1FD;
}

.paste-dropdown-btn.active .dropdown-arrow {
  filter: brightness(0) saturate(100%) invert(32%) sepia(97%) saturate(2640%) hue-rotate(230deg) brightness(103%) contrast(94%);
  opacity: 1;
}

.paste-dropdown-btn:focus-visible {
  outline: 2px solid #0097F2;
  outline-offset: 2px;
  border-radius: 4px;
  background: #e6e6e6;
}

.dropdown-arrow {
  width: 12px;
  height: 12px;
  opacity: 0.9;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  margin-top: 4px;
}

.paste-dropdown {
  right: -12px;
  min-width: 250px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 140%;
  color: #000000;
}

.dropdown-item:hover,
.dropdown-item:focus {
  background: #f8f9fa;
  outline: none;
}

.dropdown-item:focus-visible {
  background: #e6f3ff;
  outline: 2px solid #0097F2;
  outline-offset: -2px;
}

.dropdown-item-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}
</style>