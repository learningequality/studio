<template>
  <div class="dropdown-container" @keydown="handleContainerKeydown">
    <button 
      ref="dropdownButton"
      class="format-dropdown" 
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :aria-label="t('textFormatOptions')"
      @click="toggleDropdown"
      @keydown="handleButtonKeydown"
    >
      <span>{{ selectedFormat }}</span>
      <img :src="require('../../../assets/icon-chevron-down.svg')" alt="" class="dropdown-icon">
    </button>
    <div 
      v-if="isOpen" 
      ref="dropdownMenu"
      class="dropdown-menu headers-dropdown"
      role="menu"
      :aria-label="t('formatOptions')"
    >
      <div 
        v-for="(format, index) in formatOptions" 
        :key="format.value"
        class="dropdown-item" 
        role="menuitem"
        :tabindex="index === focusedIndex ? 0 : -1"
        :ref="el => setItemRef(el, index)"
        :aria-selected="selectedFormat === format.label"
        @click="applyFormat(format)"
        @keydown="handleItemKeydown($event, index, format)"
      >
        <component :is="format.tag" v-text="format.label" />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, ref, nextTick, watch } from 'vue'
import { useDropdowns } from '../../composables/useDropdowns'
import { useToolbarActions } from '../../composables/useToolbarActions'

export default defineComponent({
  name: 'FormatDropdown',
  setup() {
    const { 
      formatOptions,
      selectedFormat, 
      showHeadersDropdown: isOpen, 
      toggleHeadersDropdown: toggleDropdown,
      selectFormat
    } = useDropdowns()

    const { handleFormatChange, t } = useToolbarActions()

    const dropdownButton = ref(null)
    const dropdownMenu = ref(null)
    const itemRefs = ref([])
    const focusedIndex = ref(0)

    const setItemRef = (el, index) => {
      if (el) {
        itemRefs.value[index] = el
      }
    }

    const applyFormat = (format) => {
      selectFormat(format)
      handleFormatChange(format.value)
      toggleDropdown()
      dropdownButton.value?.focus()
    }

    const handleButtonKeydown = async (event) => {
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
            focusedIndex.value = formatOptions.value.length - 1
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

    const handleItemKeydown = (event, index, format) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault()
          applyFormat(format)
          toggleDropdown()
          break
        case 'ArrowDown':
          event.preventDefault()
          focusedIndex.value = (index + 1) % formatOptions.value.length
          itemRefs.value[focusedIndex.value]?.focus()
          break
        case 'ArrowUp':
          event.preventDefault()
          focusedIndex.value = index === 0 ? formatOptions.value.length - 1 : index - 1
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
          focusedIndex.value = formatOptions.value.length - 1
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
      t
    }
  }
})
</script>

<style scoped>
.dropdown-container {
  position: relative;
}

.format-dropdown {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px 8px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  border-radius: 4px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.format-dropdown:hover {
  background: #e6e6e6;
}

.format-dropdown:active {
  background: #d1d5da;
}

.format-dropdown:focus-visible {
  outline: 2px solid #0097F2;
  outline-offset: 2px;
  border-radius: 4px;
  background: #e6e6e6;
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
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  margin-top: 4px;
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

.dropdown-item[aria-selected="true"] {
  background: #e6f3ff;
  font-weight: 600;
}
</style>